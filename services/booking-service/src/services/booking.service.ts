import { Injectable, NotFoundException, OnModuleInit, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateBookingInput, UpdateBookingInput, BookingFilterInput, BookingStatus } from '../dto/booking.dto';
import { PrismaService } from './prisma.service';
import { connectConsumer, startConsumer, produceMessage } from '../utils/kafka';
import { Booking } from '@prisma/client';

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

  async createBooking(data: CreateBookingInput): Promise<Booking> {
    // Set passengerId to userId if not provided
    if (!data.passengerId) {
      data.passengerId = data.userId;
    }
    
    // First check if the ride exists and has available seats
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      console.log(`Checking available seats for ride ${data.rideId} at ${rideServiceUrl}`);
      
      const rideResponse = await fetch(`${rideServiceUrl}/rides/${data.rideId}`)
        .catch(error => {
          console.error(`Network error fetching ride: ${error.message}`);
          return null;
        });
      
      if (rideResponse && rideResponse.ok) {
        const ride = await rideResponse.json();
        
        // Check if there are seats available
        if (ride.seatsAvailable <= 0) {
          throw new BadRequestException('No seats available for this ride');
        }
        
        console.log(`Ride has ${ride.seatsAvailable} seats available`);
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.warn(`Error checking ride seats: ${error.message}`);
      // Continue with booking creation even if seat check fails
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
    
    // Try to update available seats in the ride service
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      console.log(`Attempting to update seats for ride ${data.rideId} at ${rideServiceUrl}`);
      
      const response = await fetch(`${rideServiceUrl}/rides/${data.rideId}/seats`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ change: -1 }), // Decrease available seats by 1
      }).catch(error => {
        console.error(`Network error updating ride seats: ${error.message}`);
        return null;
      });
      
      if (!response) {
        console.warn(`Failed to connect to ride service at ${rideServiceUrl}/rides/${data.rideId}/seats`);
      } else if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`Failed to update seats for ride ${data.rideId}: Status ${response.status} - ${errorText}`);
        
        // If the error is due to no seats available, delete the booking and throw an error
        if (response.status === 400 && errorText.includes('Not enough seats available')) {
          // Delete the booking we just created
          await this.prisma.booking.delete({ where: { id: booking.id } });
          throw new BadRequestException('No seats available for this ride');
        }
      } else {
        console.log(`Successfully updated seats for ride ${data.rideId}`);
      }
    } catch (error) {
      console.error(`Error updating ride seats: ${error.message}`);
    }
    
    // // Try to notify the driver
    // try {
    //   await this.notifyDriver(data.rideId, 'booked', data.passengerId);
    // } catch (error) {
    //   console.error(`Error notifying driver: ${error.message}`);
    // }
    
    return booking;
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
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      console.log(`Checking ride ${booking.rideId} for cancellation at ${rideServiceUrl}`);
      
      // Use fetch instead of axios
      const rideResponse = await fetch(`${rideServiceUrl}/rides/${booking.rideId}`)
        .catch(error => {
          console.error(`Network error fetching ride: ${error.message}`);
          return null;
        });
      
      if (!rideResponse) {
        console.warn(`Failed to connect to ride service at ${rideServiceUrl}/rides/${booking.rideId}`);
      } else if (rideResponse.ok) {
        const ride = await rideResponse.json();
        
        if (ride.bookingDeadline && new Date(ride.bookingDeadline) < new Date()) {
          throw new BadRequestException('Cancellation deadline has passed for this ride');
        }
        
        // Update available seats in the ride service
        const seatResponse = await fetch(`${rideServiceUrl}/rides/${booking.rideId}/seats`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ change: 1 }), // Increase available seats by 1
        }).catch(error => {
          console.error(`Network error updating ride seats: ${error.message}`);
          return null;
        });
        
        if (!seatResponse) {
          console.warn(`Failed to connect to ride service for seat update at ${rideServiceUrl}/rides/${booking.rideId}/seats`);
        } else if (!seatResponse.ok) {
          const errorText = await seatResponse.text().catch(() => 'Unknown error');
          console.warn(`Failed to update seats for ride ${booking.rideId}: Status ${seatResponse.status} - ${errorText}`);
        } else {
          console.log(`Successfully updated seats for ride ${booking.rideId}`);
        }
      } else if (rideResponse.status !== 404) {
        // If it's not a 404, log the error
        const errorText = await rideResponse.text().catch(() => 'Unknown error');
        console.warn(`Failed to fetch ride ${booking.rideId}: Status ${rideResponse.status} - ${errorText}`);
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
    
    // // Notify the driver about the cancellation
    // await this.notifyDriver(booking.rideId, 'cancelled', booking.passengerId);
    
    return updatedBooking;
  }

  async acceptBooking(id: string, driverId: string) {
    const booking = await this.getBookingById(id);
    
    // Check if the booking is for a ride owned by the driver
    try {
      const rideServiceUrl = process.env.RIDE_SERVICE_URL || 'http://localhost:3002';
      console.log(`Checking ride ${booking.rideId} for acceptance at ${rideServiceUrl}`);
      
      // Use fetch instead of axios
      const rideResponse = await fetch(`${rideServiceUrl}/rides/${booking.rideId}`)
        .catch(error => {
          console.error(`Network error fetching ride: ${error.message}`);
          return null;
        });
      
      if (!rideResponse) {
        console.warn(`Failed to connect to ride service at ${rideServiceUrl}/rides/${booking.rideId}`);
      } else if (rideResponse.ok) {
        const ride = await rideResponse.json();
        
        if (ride.driverId !== driverId) {
          throw new ForbiddenException('You can only accept bookings for your own rides');
        }
      } else if (rideResponse.status !== 404) {
        // If it's not a 404, log the error
        const errorText = await rideResponse.text().catch(() => 'Unknown error');
        console.warn(`Failed to fetch ride ${booking.rideId}: Status ${rideResponse.status} - ${errorText}`);
      } else {
        console.log(`Ride with ID ${booking.rideId} not found, but proceeding with acceptance`);
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // For other errors, log but continue with acceptance
      console.error('Error checking ride for acceptance:', error);
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
      console.log(`Checking ride ${booking.rideId} for rejection at ${rideServiceUrl}`);
      
      // Use fetch instead of axios
      const rideResponse = await fetch(`${rideServiceUrl}/rides/${booking.rideId}`)
        .catch(error => {
          console.error(`Network error fetching ride: ${error.message}`);
          return null;
        });
      
      if (!rideResponse) {
        console.warn(`Failed to connect to ride service at ${rideServiceUrl}/rides/${booking.rideId}`);
      } else if (rideResponse.ok) {
        const ride = await rideResponse.json();
        
        if (ride.driverId !== driverId) {
          throw new ForbiddenException('You can only reject bookings for your own rides');
        }
        
        // Update available seats in the ride service
        const seatResponse = await fetch(`${rideServiceUrl}/rides/${booking.rideId}/seats`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ change: 1 }), // Increase available seats by 1
        }).catch(error => {
          console.error(`Network error updating ride seats: ${error.message}`);
          return null;
        });
        
        if (!seatResponse) {
          console.warn(`Failed to connect to ride service for seat update at ${rideServiceUrl}/rides/${booking.rideId}/seats`);
        } else if (!seatResponse.ok) {
          const errorText = await seatResponse.text().catch(() => 'Unknown error');
          console.warn(`Failed to update seats for ride ${booking.rideId}: Status ${seatResponse.status} - ${errorText}`);
        } else {
          console.log(`Successfully updated seats for ride ${booking.rideId}`);
        }
      } else if (rideResponse.status !== 404) {
        // If it's not a 404, log the error
        const errorText = await rideResponse.text().catch(() => 'Unknown error');
        console.warn(`Failed to fetch ride ${booking.rideId}: Status ${rideResponse.status} - ${errorText}`);
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

  // // Helper method to notify driver via Kafka
  // private async notifyDriver(rideId: string, action: 'booked' | 'cancelled', passengerId: string) {
  //   try {
  //     // Get ride details to get the driver ID
  //     const rideResponse = await fetch(`${process.env.RIDE_SERVICE_URL}/rides/${rideId}`);
      
  //     if (!rideResponse.ok) {
  //       throw new Error(`Failed to fetch ride: ${rideResponse.statusText}`);
  //     }
      
  //     const ride = await rideResponse.json();
      
  //     // Send notification via Kafka
  //     await produceMessage('driver-notifications', {
  //       driverId: ride.driverId,
  //       rideId: rideId,
  //       action: action,
  //       passengerId: passengerId,
  //       timestamp: new Date().toISOString(),
  //     });
      
  //     console.log(`Notification sent to driver ${ride.driverId} about ${action} ride ${rideId}`);
  //   } catch (error) {
  //     console.error('Failed to notify driver:', error);
  //   }
  // }
}