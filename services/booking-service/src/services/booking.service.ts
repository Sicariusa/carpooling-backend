import { Injectable, NotFoundException, OnModuleInit, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateBookingInput, UpdateBookingInput, BookingFilterInput, BookingStatus } from '../dto/booking.dto';
import { PrismaService } from './prisma.service';
import { connectConsumer, startConsumer, produceMessage } from '../utils/kafka';

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

  async createBooking(data: CreateBookingInput) {
    try {
      // If passengerId is not provided, use userId as the passengerId
      const passengerId = data.passengerId || data.userId;
      
      // First, try to create a mock user if it doesn't exist
      try {
        await this.prisma.user.upsert({
          where: { id: data.userId },
          update: {},
          create: {
            id: data.userId,
            email: `test-${data.userId}@example.com`,
            firstName: 'Test',
            lastName: 'User',
          },
        });
      } catch (error) {
        // User might already exist, ignore the error
        console.log('User might already exist:', error.message);
      }

      // Check if the ride exists and has available seats
      try {
        // Use fetch instead of axios
        const rideResponse = await fetch(`${process.env.RIDE_SERVICE_URL}/rides/${data.rideId}`);
        
        if (!rideResponse.ok) {
          if (rideResponse.status === 404) {
            throw new NotFoundException(`Ride with ID ${data.rideId} not found`);
          }
          throw new Error(`Failed to fetch ride: ${rideResponse.statusText}`);
        }
        
        const ride = await rideResponse.json();
        
        if (ride.seatsAvailable <= 0) {
          throw new BadRequestException('No seats available for this ride');
        }

        if (ride.isGirlsOnly) {
          // In a real app, you would check the user's gender from the user service
          // For now, we'll assume all users can book any ride
          console.log('This is a girls-only ride. In a real app, we would check the user gender.');
        }

        // Check if the booking deadline has passed
        if (ride.bookingDeadline && new Date(ride.bookingDeadline) < new Date()) {
          throw new BadRequestException('Booking deadline has passed for this ride');
        }

        // Update available seats in the ride service
        const updateResponse = await fetch(`${process.env.RIDE_SERVICE_URL}/rides/${data.rideId}/seats`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ change: -1 }), // Decrease available seats by 1
        });
        
        if (!updateResponse.ok) {
          throw new Error(`Failed to update seats: ${updateResponse.statusText}`);
        }
      } catch (error) {
        if (error instanceof NotFoundException || error instanceof BadRequestException) {
          throw error;
        }
        console.error('Error checking ride:', error);
        throw new Error(`Failed to process booking: ${error.message}`);
      }
      
      // Now create the booking
      const booking = await this.prisma.booking.create({
        data: {
          userId: data.userId,
          passengerId: passengerId,
          rideId: data.rideId,
          status: data.status || BookingStatus.PENDING,
          pickupLocation: data.pickupLocation,
          dropoffLocation: data.dropoffLocation,
        },
      });

      // Notify the driver about the new booking
      await this.notifyDriver(data.rideId, 'booked', passengerId);
      
      return booking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  async getBookingById(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    
    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
    
    return booking;
  }

  async updateBooking(id: string, data: UpdateBookingInput) {
    try {
      const booking = await this.getBookingById(id);
      
      // If updating destination (dropoffLocation), no special handling needed
      
      return await this.prisma.booking.update({
        where: { id },
        data: {
          status: data.status,
          pickupLocation: data.pickupLocation,
          dropoffLocation: data.dropoffLocation,
        },
      });
    } catch (error) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
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
      // Use fetch instead of axios
      const rideResponse = await fetch(`${process.env.RIDE_SERVICE_URL}/rides/${booking.rideId}`);
      
      if (rideResponse.ok) {
        const ride = await rideResponse.json();
        
        if (ride.bookingDeadline && new Date(ride.bookingDeadline) < new Date()) {
          throw new BadRequestException('Cancellation deadline has passed for this ride');
        }
        
        // Update available seats in the ride service
        await fetch(`${process.env.RIDE_SERVICE_URL}/rides/${booking.rideId}/seats`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ change: 1 }), // Increase available seats by 1
        });
      } else if (rideResponse.status !== 404) {
        // If it's not a 404, throw an error
        throw new Error(`Failed to fetch ride: ${rideResponse.statusText}`);
      } else {
        console.log(`Ride with ID ${booking.rideId} not found, but proceeding with cancellation`);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // For other errors, log but continue with cancellation
      console.error('Error checking ride for cancellation:', error);
    }
    
    // Update booking status to cancelled
    const updatedBooking = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
    
    // Notify the driver about the cancellation
    await this.notifyDriver(booking.rideId, 'cancelled', booking.passengerId);
    
    return updatedBooking;
  }

  async acceptBooking(id: string, driverId: string) {
    const booking = await this.getBookingById(id);
    
    // Check if the booking is for a ride owned by the driver
    try {
      // Use fetch instead of axios
      const rideResponse = await fetch(`${process.env.RIDE_SERVICE_URL}/rides/${booking.rideId}`);
      
      if (!rideResponse.ok) {
        if (rideResponse.status === 404) {
          throw new NotFoundException(`Ride with ID ${booking.rideId} not found`);
        }
        throw new Error(`Failed to fetch ride: ${rideResponse.statusText}`);
      }
      
      const ride = await rideResponse.json();
      
      if (ride.driverId !== driverId) {
        throw new ForbiddenException('You can only accept bookings for your own rides');
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      console.error('Error checking ride for acceptance:', error);
      throw new Error(`Failed to process booking acceptance: ${error.message}`);
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
      // Use fetch instead of axios
      const rideResponse = await fetch(`${process.env.RIDE_SERVICE_URL}/rides/${booking.rideId}`);
      
      if (rideResponse.ok) {
        const ride = await rideResponse.json();
        
        if (ride.driverId !== driverId) {
          throw new ForbiddenException('You can only reject bookings for your own rides');
        }
        
        // Update available seats in the ride service
        await fetch(`${process.env.RIDE_SERVICE_URL}/rides/${booking.rideId}/seats`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ change: 1 }), // Increase available seats by 1
        });
      } else if (rideResponse.status !== 404) {
        // If it's not a 404, throw an error
        throw new Error(`Failed to fetch ride: ${rideResponse.statusText}`);
      } else {
        console.log(`Ride with ID ${booking.rideId} not found, but proceeding with rejection`);
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // For other errors, log but continue with rejection
      console.error('Error checking ride for rejection:', error);
    }
    
    // Update booking status to rejected
    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.REJECTED },
    });
  }

  async deleteBooking(id: string) {
    try {
      return await this.prisma.booking.delete({
        where: { id },
      });
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

  // Helper method to notify driver via Kafka
  private async notifyDriver(rideId: string, action: 'booked' | 'cancelled', passengerId: string) {
    try {
      // Get ride details to get the driver ID
      const rideResponse = await fetch(`${process.env.RIDE_SERVICE_URL}/rides/${rideId}`);
      
      if (!rideResponse.ok) {
        throw new Error(`Failed to fetch ride: ${rideResponse.statusText}`);
      }
      
      const ride = await rideResponse.json();
      
      // Send notification via Kafka
      await produceMessage('driver-notifications', {
        driverId: ride.driverId,
        rideId: rideId,
        action: action,
        passengerId: passengerId,
        timestamp: new Date().toISOString(),
      });
      
      console.log(`Notification sent to driver ${ride.driverId} about ${action} ride ${rideId}`);
    } catch (error) {
      console.error('Failed to notify driver:', error);
    }
  }
}