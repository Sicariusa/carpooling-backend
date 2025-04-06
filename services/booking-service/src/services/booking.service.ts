import { Injectable, NotFoundException, OnModuleInit, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { CreateBookingInput, BookingStatus } from '../dto/booking.dto';
import { PrismaService } from './prisma.service';
import { connectConsumer, startConsumer, produceMessage } from '../utils/kafka';
import { Booking } from '@prisma/client';

const logger = new Logger('BookingService');

// Map to track pending bookings waiting for verification
const pendingVerifications = new Map();
  
@Injectable()
export class BookingService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}
  
  async onModuleInit() {
    try {
      await connectConsumer();
      await startConsumer(this);
      logger.log('Kafka consumer initialized');
    } catch (error) {
      logger.error(`Kafka consumer init failed: ${error.message}`);
    }
  }

  async BookRide(data: CreateBookingInput, userId: string): Promise<Booking> {
    try {
      // Create a booking with PENDING status
      const booking = await this.prisma.booking.create({
        data: {
          userId: userId,
          rideId: data.rideId,
          status: BookingStatus.PENDING,
          pickupLocation: data.pickupLocation,
          dropoffLocation: data.dropoffLocation,
        } as any, // Type assertion to avoid type error
      });
      
      // Send a booking verification request via Kafka
      await produceMessage('booking-events', {
        type: 'BOOKING_CREATED',
        bookingId: booking.id,
        rideId: data.rideId,
        userId: userId
      });

      // Notify the payment service to create a payment intent
      // This would ideally be handled as part of the Kafka flow in a real microservices architecture
      // For simplicity, we're using a direct HTTP call to the payment service
      try {
        const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004';
        const response = await fetch(`${paymentServiceUrl}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              mutation CreatePayment($input: CreatePaymentInput!) {
                createPayment(input: $input) {
                  id
                  clientSecret
                }
              }
            `,
            variables: {
              input: {
                bookingId: booking.id,
                amount: 20.00, // This would come from the ride service in a real app
                currency: 'USD',
              }
            }
          }),
        });

        const paymentData = await response.json();
        logger.log(`Payment intent created for booking: ${booking.id}`);
        
        // In a real app, you might want to store the payment intent info or client secret
        // in the booking metadata or a separate table
      } catch (paymentError) {
        logger.error(`Failed to create payment intent: ${paymentError.message}`);
        // Continue with the booking process even if payment intent creation fails
        // In a production system, you might want to handle this differently
      }
      
      logger.log(`Booking created and verification requested: ${booking.id}`);
      return booking;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to book ride: ${error.message}`);
    }
  }

  async getBookingById(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking with ID ${id} not found`);
    return booking;
  }

  async cancelBooking(id: string, userId: string) {
    const booking = await this.getBookingById(id);
    
    if (booking.userId !== userId) throw new ForbiddenException('You can only cancel your own bookings');
    if (booking.status === BookingStatus.CANCELLED) throw new BadRequestException('Booking already cancelled');
    
    try {
      // Send a booking cancellation event via Kafka
      await produceMessage('booking-events', {
        type: 'BOOKING_CANCELLED',
        bookingId: booking.id,
        rideId: booking.rideId,
        userId: booking.userId
      });
      
      // Update local booking status
      return this.prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED },
      });
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to cancel booking: ${error.message}`);
    }
  }

  async acceptBooking(id: string, driverId: string) {
    const booking = await this.getBookingById(id);
    
    if (booking.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException('Booking already confirmed');
    }
    
    try {
      // Send a booking acceptance event via Kafka
      await produceMessage('booking-events', {
        type: 'BOOKING_ACCEPTED',
        bookingId: booking.id,
        rideId: booking.rideId,
        driverId: driverId
      });
      
      // Update the booking status
      return this.prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CONFIRMED },
      });
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to accept booking: ${error.message}`);
    }
  }

  async rejectBooking(id: string, driverId: string) {
    const booking = await this.getBookingById(id);
    
    try {
      // Send a booking rejection event via Kafka
      await produceMessage('booking-events', {
        type: 'BOOKING_REJECTED',
        bookingId: booking.id,
        rideId: booking.rideId,
        driverId: driverId
      });
      
      return this.prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.REJECTED },
      });
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to reject booking: ${error.message}`);
    }
  }
  
  // Kafka event handlers
  
  // Handle user login events
  async logUserLogin(userId: string) {
    logger.log(`User logged in: ${userId}`);
    // Additional login handling logic can be added here
  }
  
  // Called when a booking verification succeeds
  async processVerificationSuccess(bookingId: string, rideId: string, driverId: string) {
    logger.log(`Booking verification successful for booking ${bookingId}`);
    
    // Update the booking with the verification result if needed
    // For now, we'll keep it in PENDING status until the driver accepts
  }
  
  // Called when a payment is completed successfully
  async handlePaymentSuccess(bookingId: string) {
    logger.log(`Payment successful for booking ${bookingId}, notifying ride service`);
    
    try {
      const booking = await this.getBookingById(bookingId);
      
      if (booking.status === BookingStatus.CONFIRMED) {
        logger.log(`Booking ${bookingId} already confirmed, skipping`);
        return booking;
      }
      
      // Send a booking acceptance event via Kafka to update seat availability
      await produceMessage('booking-events', {
        type: 'BOOKING_ACCEPTED',
        bookingId: booking.id,
        rideId: booking.rideId,
        driverId: 'system-payment', // System-initiated acceptance
        reason: 'payment_completed'
      });
      
      // Update the booking status to CONFIRMED
      const updatedBooking = await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CONFIRMED },
      });
      
      logger.log(`Booking ${bookingId} confirmed after successful payment`);
      return updatedBooking;
      
    } catch (error) {
      logger.error(`Failed to handle payment success for booking ${bookingId}: ${error.message}`);
      throw new BadRequestException(`Failed to process payment success: ${error.message}`);
    }
  }
  
  // Called when a booking verification fails
  async processVerificationFailure(bookingId: string, rideId: string, reason: string) {
    logger.log(`Booking verification failed for booking ${bookingId}: ${reason}`);
    
    try {
      // Update the booking to REJECTED status with the failure reason
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.REJECTED },
      });
      
      // Additional notification logic could be added here
    } catch (error) {
      logger.error(`Error updating booking after verification failure: ${error.message}`);
    }
  }
  
  // Handle ride cancellation events
  async handleRideCancellation(rideId: string) {
    logger.log(`Ride ${rideId} was cancelled, updating affected bookings`);
    
    try {
      // Find all bookings for the cancelled ride
      const bookings = await this.prisma.booking.findMany({
        where: {
          rideId,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
          }
        }
      });
      
      // Update all affected bookings to CANCELLED
      for (const booking of bookings) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED }
        });
        
        // Additional notification logic could be added here
      }
      
      logger.log(`Updated ${bookings.length} bookings to CANCELLED due to ride cancellation`);
    } catch (error) {
      logger.error(`Error handling ride cancellation: ${error.message}`);
    }
  }
  
  async getAllBookings() {
    return this.prisma.booking.findMany();
  }
  
  async getUserBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Add a new REST endpoint to handle payment success notifications
  async updateBookingAfterPayment(bookingId: string, status: string): Promise<Booking> {
    logger.log(`Received payment update for booking ${bookingId} with status ${status}`);
    
    try {
      const booking = await this.getBookingById(bookingId);
      
      if (status === 'COMPLETED') {
        return this.handlePaymentSuccess(bookingId);
      } else if (status === 'FAILED' || status === 'CANCELLED') {
        // Update booking status based on payment failure
        return this.prisma.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.CANCELLED }
        });
      }
      
      return booking;
    } catch (error) {
      logger.error(`Failed to update booking after payment: ${error.message}`);
      throw new BadRequestException(`Failed to update booking: ${error.message}`);
    }
  }
}