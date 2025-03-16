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

  async BookRide(data: CreateBookingInput, token?: string): Promise<Booking> {
    // Set passengerId to userId if not provided
    if (!data.passengerId) {
      data.passengerId = data.userId;
    }
    
    // Check if ride exists and has available seats
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header if token is provided
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const rideResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `query { getRideById(id: "${data.rideId}") { id seatsAvailable } }`
        }),
      }).catch(error => {
        logger.error(`Failed to fetch ride data: ${error.message}`);
        return null;
      });
      
      if (!rideResponse?.ok) {
        logger.error(`Ride service returned status: ${rideResponse?.status}`);
        throw new BadRequestException('Failed to verify ride details');
      }
      
      const result = await rideResponse.json();
      
      // Check for GraphQL errors
      if (result.errors) {
        const errorMessage = result.errors[0]?.message || 'Unknown error';
        logger.error(`GraphQL error: ${errorMessage}`);
        throw new BadRequestException(`Failed to verify ride: ${errorMessage}`);
      }
      
      if (result.data?.getRideById?.seatsAvailable <= 0) {
        throw new BadRequestException('No seats available for this ride');
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      logger.error(`Unexpected error: ${error.message}`);
      throw new BadRequestException('Failed to verify ride availability');
    }
    
    // Create the booking with PENDING status
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
    
    // Note: We're no longer updating available seats here
    // Seats will only be updated when the driver accepts the booking
    
    logger.log('Booking request created successfully');
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

  async cancelBooking(id: string, userId: string, token?: string) {
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
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header if token is provided
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const rideResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `query { getRideById(id: "${booking.rideId}") { id bookingDeadline } }`
        }),
      }).catch(error => {
        logger.error(`Failed to fetch ride data: ${error.message}`);
        return null;
      });
      
      if (!rideResponse?.ok) {
        logger.error(`Ride service returned status: ${rideResponse?.status}`);
        throw new BadRequestException('Failed to verify ride details');
      }
      
      const result = await rideResponse.json();
      
      // Check for GraphQL errors
      if (result.errors) {
        const errorMessage = result.errors[0]?.message || 'Unknown error';
        logger.error(`GraphQL error: ${errorMessage}`);
        throw new BadRequestException(`Failed to verify ride: ${errorMessage}`);
      }
      
      const ride = result.data?.getRideById;
      
      if (ride?.bookingDeadline && new Date(ride.bookingDeadline) < new Date()) {
        throw new BadRequestException('Cancellation deadline has passed for this ride');
      }
      
      // Only update available seats if the booking was CONFIRMED
      if (booking.status === BookingStatus.CONFIRMED) {
        const updateResponse = await fetch(`${rideServiceUrl}/graphql`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `mutation { updateAvailableSeats(id: "${booking.rideId}", change: 1) { id } }`
          }),
        }).catch(error => {
          logger.error(`Failed to update seats: ${error.message}`);
          return null;
        });
        
        if (!updateResponse?.ok) {
          logger.error(`Seat update failed with status: ${updateResponse?.status}`);
          throw new BadRequestException('Failed to update available seats');
        }
        
        const updateResult = await updateResponse.json();
        if (updateResult.errors) {
          const errorMessage = JSON.stringify(updateResult.errors);
          logger.error(`Seat update returned errors: ${errorMessage}`);
          throw new BadRequestException('Failed to update available seats');
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      logger.error(`Unexpected error: ${error.message}`);
      throw new BadRequestException('Failed to process booking cancellation');
    }
    
    // Update booking status to cancelled
    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }

  async acceptBooking(id: string, driverId: string, token?: string) {
    const booking = await this.getBookingById(id);
    
    // Check if the booking is already confirmed
    if (booking.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException('Booking is already confirmed');
    }
    
    // Check if the booking is for a ride owned by the driver
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header if token is provided
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const rideResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `query { getRideById(id: "${booking.rideId}") { id driverId seatsAvailable } }`
        }),
      }).catch(error => {
        logger.error(`Failed to fetch ride data: ${error.message}`);
        return null;
      });
      
      if (!rideResponse?.ok) {
        logger.error(`Ride service returned status: ${rideResponse?.status}`);
        throw new BadRequestException('Failed to verify ride ownership');
      }
      
      const result = await rideResponse.json();
      
      // Check if there are any errors in the response
      if (result.errors) {
        const errorMessage = result.errors[0]?.message || 'Unknown error';
        logger.error(`GraphQL error: ${errorMessage}`);
        throw new BadRequestException(`Failed to verify ride: ${errorMessage}`);
      }
      
      logger.debug(`Ride data: ${JSON.stringify(result)}`);
      
      const ride = result.data?.getRideById;
      if (!ride) {
        throw new BadRequestException(`Ride with ID ${booking.rideId} not found`);
      }
      
      logger.debug(`Comparing driver IDs: ${ride.driverId} vs ${driverId}`);
      if (ride.driverId !== driverId) {
        throw new ForbiddenException('You can only accept bookings for your own rides');
      }
      
      // Check if there are still seats available
      if (ride.seatsAvailable <= 0) {
        throw new BadRequestException('No seats available for this ride');
      }
      
      // Update available seats in the ride service
      const updateResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `mutation { updateAvailableSeats(id: "${booking.rideId}", change: -1) { id seatsAvailable } }`
        }),
      }).catch(error => {
        logger.error(`Failed to update seats: ${error.message}`);
        return null;
      });
      
      if (!updateResponse?.ok) {
        logger.error(`Seat update failed with status: ${updateResponse?.status}`);
        throw new BadRequestException('Failed to update available seats');
      }
      
      const updateResult = await updateResponse.json();
      if (updateResult.errors) {
        const errorMessage = JSON.stringify(updateResult.errors);
        logger.error(`Seat update returned errors: ${errorMessage}`);
        if (errorMessage.includes('Not enough seats available')) {
          throw new BadRequestException('No seats available for this ride');
        }
        throw new BadRequestException('Failed to update available seats');
      }
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) throw error;
      logger.error(`Unexpected error: ${error.message}`);
      throw new BadRequestException('Failed to process booking acceptance');
    }
    
    // Update booking status to confirmed
    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
    });

    logger.log(`Booking ${id} accepted by driver ${driverId}`);
    return updatedBooking;
  }

  async rejectBooking(id: string, driverId: string, token?: string) {
    const booking = await this.getBookingById(id);
    
    // Check if the booking is for a ride owned by the driver
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add authorization header if token is provided
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const rideResponse = await fetch(`${rideServiceUrl}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: `query { getRideById(id: "${booking.rideId}") { id driverId } }`
        }),
      }).catch(error => {
        logger.error(`Failed to fetch ride data: ${error.message}`);
        return null;
      });
      
      if (!rideResponse?.ok) {
        logger.error(`Ride service returned status: ${rideResponse?.status}`);
        throw new BadRequestException('Failed to verify ride ownership');
      }
      
      const result = await rideResponse.json();
      
      // Check for GraphQL errors
      if (result.errors) {
        const errorMessage = result.errors[0]?.message || 'Unknown error';
        logger.error(`GraphQL error: ${errorMessage}`);
        throw new BadRequestException(`Failed to verify ride: ${errorMessage}`);
      }
      
      const ride = result.data?.getRideById;
      if (!ride) {
        throw new BadRequestException(`Ride with ID ${booking.rideId} not found`);
      }
      
      if (ride.driverId !== driverId) {
        throw new ForbiddenException('You can only reject bookings for your own rides');
      }
      
      // No need to update available seats since we're not decrementing them at booking creation
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof BadRequestException) throw error;
      logger.error(`Unexpected error: ${error.message}`);
      throw new BadRequestException('Failed to process booking rejection');
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