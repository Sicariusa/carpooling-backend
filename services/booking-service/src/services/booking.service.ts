import { Injectable, NotFoundException, OnModuleInit, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateBookingInput, UpdateBookingInput, BookingFilterInput, BookingStatus } from '../dto/booking.dto';
import { PrismaService } from './prisma.service';
import { connectConsumer, startConsumer } from '../utils/kafka';
import { Booking } from '@prisma/client';
import { Logger } from '@nestjs/common';

const logger = new Logger('BookingService');
  
@Injectable()
export class BookingService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}
  
  async onModuleInit() {
    // Connect and start the Kafka consumer when the service initializes
    try {
      await connectConsumer();
      await startConsumer(this);
      console.log('Kafka consumer initialized for booking service');
    } catch (error) {
      console.error('Failed to initialize Kafka consumer:', error);
    }
  }

  // Log user login event (can be called directly if needed)
  async logUserLogin(userId: string) {
    console.log(`User ${userId} logged in at ${new Date().toISOString()}`);
    // You could also store this information in the database if needed
    return { userId, timestamp: new Date() };
  }

  async BookRide(data: CreateBookingInput): Promise<Booking> {
    // Set passengerId to userId if not provided
    if (!data.passengerId) {
      data.passengerId = data.userId;
    }
    
    // Check if ride exists and has available seats
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      const rideResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { getRideById(id: "${data.rideId}") { id seatsAvailable } }`
        }),
      }).catch(error => null);
      
      if (rideResponse?.ok) {
        const result = await rideResponse.json();
        if (result.data?.getRideById?.seatsAvailable <= 0) {
          throw new BadRequestException('No seats available for this ride');
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
    }
    
    // Create the booking
    const booking = await this.prisma.booking.create({
      data: {
        userId: data.userId,
        passengerId: data.passengerId,
        rideId: data.rideId,
        status: data.status || BookingStatus.PENDING,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
      },
    });
    
    // Update available seats in the ride service
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      const response = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation { updateAvailableSeats(id: "${data.rideId}", change: -1) { id seatsAvailable } }`
        }),
      }).catch(error => null);
      
      if (response?.ok) {
        const result = await response.json();
        if (result.errors) {
          const errorMessage = JSON.stringify(result.errors);
          if (errorMessage.includes('Not enough seats available')) {
            await this.prisma.booking.delete({ where: { id: booking.id } });
            throw new BadRequestException('No seats available for this ride');
          }
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
    }
    logger.log('Booking created successfully');
    return booking;
  }

  async getBookingById(id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking with ID ${id} not found`);
    return booking;
  }

  async updateBooking(id: string, data: UpdateBookingInput) {
    await this.getBookingById(id);
    return this.prisma.booking.update({
      where: { id },
      data: {
        status: data.status,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
      },
    });
  }

  async cancelBooking(id: string, userId: string) {
    const booking = await this.getBookingById(id);
    
    // Check if the booking belongs to the user
    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }
    
    // Check if the booking is already cancelled
    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }
    
    // Check if the booking can be cancelled (deadline not passed)
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      const rideResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { getRideById(id: "${booking.rideId}") { id bookingDeadline } }`
        }),
      }).catch(error => null);
      
      if (rideResponse?.ok) {
        const result = await rideResponse.json();
        const ride = result.data?.getRideById;
        
        if (ride?.bookingDeadline && new Date(ride.bookingDeadline) < new Date()) {
          throw new BadRequestException('Cancellation deadline has passed for this ride');
        }
        
        // Update available seats in the ride service
        await fetch(`${rideServiceUrl}/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation { updateAvailableSeats(id: "${booking.rideId}", change: 1) { id } }`
          }),
        }).catch(error => null);
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
    }
    
    // Update booking status to cancelled
    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }

  async acceptBooking(id: string, driverId: string) {
    const booking = await this.getBookingById(id);
    
    // Check if the booking is for a ride owned by the driver
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      const rideResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { getRideById(id: "${booking.rideId}") { id driverId } }`
        }),
      }).catch(error => null);
      
      if (rideResponse?.ok) {
        const result = await rideResponse.json();
        const ride = result.data?.getRideById;
        
        if (ride?.driverId !== driverId) {
          throw new ForbiddenException('You can only accept bookings for your own rides');
        }
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
    }
    
    // Update booking status to confirmed
    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
    });
  }

  async rejectBooking(id: string, driverId: string) {
    const booking = await this.getBookingById(id);
    
    // Check if the booking is for a ride owned by the driver
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      const rideResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { getRideById(id: "${booking.rideId}") { id driverId } }`
        }),
      }).catch(error => null);
      
      if (rideResponse?.ok) {
        const result = await rideResponse.json();
        const ride = result.data?.getRideById;
        
        if (ride?.driverId !== driverId) {
          throw new ForbiddenException('You can only reject bookings for your own rides');
        }
        
        // Update available seats in the ride service
        await fetch(`${rideServiceUrl}/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation { updateAvailableSeats(id: "${booking.rideId}", change: 1) { id } }`
          }),
        }).catch(error => null);
      }
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
    }
    
    // Update booking status to rejected
    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.REJECTED },
    });
  }

  async deleteBooking(id: string) {
    try {
      return await this.prisma.booking.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
  }

  async getAllBookings() {
    return this.prisma.booking.findMany();
  }

  async getUserBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRideBookings(rideId: string) {
    return this.prisma.booking.findMany({
      where: { rideId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async filterBookings(filters: BookingFilterInput) {
    return this.prisma.booking.findMany({
      where: {
        userId: filters.userId,
        rideId: filters.rideId,
        status: filters.status,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

 
}