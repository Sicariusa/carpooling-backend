import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateBookingInput, UpdateBookingInput } from '../dto/booking.dto';
import { PrismaService } from './prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  async createBooking(data: CreateBookingInput) {
    try {
      // If passengerId is not provided, use userId as the passengerId
      const passengerId = data.passengerId || data.userId;
      
      // First, try to create a mock user if it doesn't exist
      try {
        await this.prisma.user.create({
          data: {
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
      
      // Now create the booking
      return this.prisma.booking.create({
        data: {
          userId: data.userId,
          passengerId: passengerId,
          // rideId is now optional in the schema
          status: data.status || 'PENDING',
          pickupLocation: data.pickupLocation,
          dropoffLocation: data.dropoffLocation,
        },
      });
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
}