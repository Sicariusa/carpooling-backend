import { Injectable, NotFoundException, OnModuleInit, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { CreateBookingInput, BookingStatus } from '../dto/booking.dto';
import { PrismaService } from './prisma.service';
import { connectConsumer, startConsumer, produceMessage, requestRideData } from '../utils/kafka';
import { Booking } from '@prisma/client';
import axios from 'axios';

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
  async BookRide(data: CreateBookingInput, userId: string, context?: any): Promise<Booking> {
    try {
      const rideInfo = await requestRideData('GET_RIDE', { rideId: data.rideId });
  
      const fare = await requestRideData('CALCULATE_FARE', {
        rideId: data.rideId,
        pickupStopId: data.pickupStopId,
        dropoffStopId: data.dropoffStopId,
      }) as number;
  
      const pickupStop = await requestRideData('GET_STOP', { stopId: data.pickupStopId }) as { name: string };
      const dropoffStop = await requestRideData('GET_STOP', { stopId: data.dropoffStopId }) as { name: string };
  
      // Step 1: Create the booking with PENDING status
      const booking = await this.prisma.booking.create({
        data: {
          userId,
          passengerId: userId,
          rideId: data.rideId,
          status: BookingStatus.PENDING,
          pickupStopId: data.pickupStopId,
          dropoffStopId: data.dropoffStopId,
          pickupLocation: pickupStop.name || 'Unknown location',
          dropoffLocation: dropoffStop.name || 'Unknown location',
          price: fare,
        } as any,
      });
  
      // Step 2: Send booking creation event to Kafka
      await produceMessage('booking-events', {
        type: 'BOOKING_CREATED',
        bookingId: booking.id,
        rideId: data.rideId,
        userId,
      });
  
      // Step 3: Try to call payment service, but continue if it fails
      try {
        await axios.post(`${process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003'}/graphql`, {
          query: `
            mutation {
              createPayment(data: {
                bookingId: "${booking.id}",
                amount: ${fare}
              }) {
                paymentIntentId
              }
            }
          `
        }, {
          headers: {
            Authorization: context?.req?.headers?.authorization || '',
            'Content-Type': 'application/json'
          }
        });
        console.log('Payment intent created successfully');
      } catch (paymentError) {
        console.log('Payment service call failed, but booking will continue:', paymentError.message);
      }
  
      // Step 4: Return booking immediately (payment pending)
      return booking;
  
    } catch (error) {
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

  async confirmBookingFromWebhook(bookingId: string): Promise<Booking> {
    const booking = await this.getBookingById(bookingId);
    console.log('🚦 BookingService.confirmBookingFromWebhook triggered:', bookingId);

  
    if (booking.status === BookingStatus.CONFIRMED) {
      return booking; // already confirmed
    }
  
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
    });
  }

  async getRideBookings(rideId: string) {
    //FIND BOOKINGS BY RIDE ID
    const bookings = await this.prisma.booking.findMany({
      where: { rideId: rideId },
    });
    console.log(bookings);
    return bookings;
  }
}