import { Injectable, NotFoundException, OnModuleInit, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { CreateBookingInput, BookingStatus } from '../dto/booking.dto';
import { PrismaService } from './prisma.service';
import { connectConsumer, startConsumer } from '../utils/kafka';
import { Booking } from '@prisma/client';

const logger = new Logger('BookingService');
  
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

  async BookRide(data: CreateBookingInput, token?: string): Promise<Booking> {
    if (!data.passengerId) data.passengerId = data.userId;
    
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      const headers = { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) };
      
      const rideResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `query { getRideById(id: "${data.rideId}") { id seatsAvailable } }`
        }),
      }).catch(error => null);
      
      if (!rideResponse?.ok) throw new BadRequestException('Failed to verify ride details');
      
      const result = await rideResponse.json();
      if (result.errors) {
        throw new BadRequestException(`Failed to verify ride: ${result.errors[0]?.message || 'Unknown error'}`);
      }
      
      if (result.data?.getRideById?.seatsAvailable <= 0) {
        throw new BadRequestException('No seats available for this ride');
      }
      
      const booking = await this.prisma.booking.create({
        data: {
          userId: data.userId,
          passengerId: data.passengerId,
          rideId: data.rideId,
          status: BookingStatus.PENDING,
          pickupLocation: data.pickupLocation,
          dropoffLocation: data.dropoffLocation,
        },
      });
      
      logger.log(`Booking created: ${booking.id}`);
      return booking;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to book ride: ${error.message}`);
    }
  }

  async getBookingById(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    return booking;
  }

  async cancelBooking(id: string, userId: string, token?: string) {
    const booking = await this.getBookingById(id);
    
    if (booking.userId !== userId) throw new ForbiddenException('You can only cancel your own bookings');
    if (booking.status === BookingStatus.CANCELLED) throw new BadRequestException('Booking already cancelled');
    
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      const headers = { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) };
      
      const rideResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `query { getRideById(id: "${booking.rideId}") { id bookingDeadline } }`
        }),
      }).catch(error => null);
      
      if (!rideResponse?.ok) throw new BadRequestException('Failed to verify ride details');
      
      const result = await rideResponse.json();
      if (result.errors) {
        throw new BadRequestException(`Failed to verify ride: ${result.errors[0]?.message || 'Unknown error'}`);
      }
      
      const ride = result.data?.getRideById;
      if (ride?.bookingDeadline && new Date(ride.bookingDeadline) < new Date()) {
        throw new BadRequestException('Cancellation deadline has passed');
      }
      
      // Only update available seats if the booking was CONFIRMED
      if (booking.status === BookingStatus.CONFIRMED) {
        await fetch(`${rideServiceUrl}/graphql`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `mutation { updateAvailableSeats(id: "${booking.rideId}", change: 1) { id } }`
          }),
        });
      }
      
      return this.prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELLED },
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      throw new BadRequestException(`Failed to cancel booking: ${error.message}`);
    }
  }

  async acceptBooking(id: string, driverId: string, token?: string) {
    const booking = await this.getBookingById(id);
    
    if (booking.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException('Booking already confirmed');
    }
    
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      const headers = { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) };
      
      const rideResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `query { getRideById(id: "${booking.rideId}") { id driverId seatsAvailable } }`
        }),
      }).catch(error => null);
      
      if (!rideResponse?.ok) throw new BadRequestException('Failed to verify ride ownership');
      
      const result = await rideResponse.json();
      if (result.errors) {
        throw new BadRequestException(`Failed to verify ride: ${result.errors[0]?.message || 'Unknown error'}`);
      }
      
      const ride = result.data?.getRideById;
      if (!ride) throw new BadRequestException(`Ride ${booking.rideId} not found`);
      
      if (ride.driverId !== driverId) {
        throw new ForbiddenException('You can only accept bookings for your own rides');
      }
      
      if (ride.seatsAvailable <= 0) throw new BadRequestException('No seats available');
      
      const updateResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation { updateAvailableSeats(id: "${booking.rideId}", change: -1) { id } }`
        }),
      }).catch(error => null);
      
      if (!updateResponse?.ok) throw new BadRequestException('Failed to update seats');
      
      const updateResult = await updateResponse.json();
      if (updateResult.errors) {
        if (updateResult.errors.toString().includes('Not enough seats')) {
          throw new BadRequestException('No seats available');
        }
        throw new BadRequestException('Failed to update seats');
      }
      
      const updatedBooking = await this.prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CONFIRMED },
      });

      logger.log(`Booking ${id} accepted by driver ${driverId}`);
      return updatedBooking;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to accept booking: ${error.message}`);
    }
  }

  async rejectBooking(id: string, driverId: string, token?: string) {
    const booking = await this.getBookingById(id);
    
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      const headers = { 'Content-Type': 'application/json', ...(token && { 'Authorization': `Bearer ${token}` }) };
      
      const rideResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `query { getRideById(id: "${booking.rideId}") { id driverId } }`
        }),
      }).catch(error => null);
      
      if (!rideResponse?.ok) throw new BadRequestException('Failed to verify ride ownership');
      
      const result = await rideResponse.json();
      if (result.errors) {
        throw new BadRequestException(`Failed to verify ride: ${result.errors[0]?.message || 'Unknown error'}`);
      }
      
      const ride = result.data?.getRideById;
      if (!ride) throw new BadRequestException(`Ride ${booking.rideId} not found`);
      
      if (ride.driverId !== driverId) {
        throw new ForbiddenException('You can only reject bookings for your own rides');
      }
      
      return this.prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.REJECTED },
      });
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to reject booking: ${error.message}`);
    }
  }

  async getAllBookings() {
    return this.prisma.booking.findMany();
  }
}