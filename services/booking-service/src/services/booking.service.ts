import { Injectable } from '@nestjs/common';
import { CreateBookingInput, UpdateBookingInput } from '../dto/booking.dto';
import { PrismaService } from './prisma.service';


@Injectable()
export class BookingService {
  constructor(private prisma: PrismaService) {}

  async createBooking(data: CreateBookingInput) {
    return this.prisma.booking.create({
      data: {
        rideId: data.rideId,
        passengerId: data.passengerId,
        status: data.status || 'pending',
      },
    });
  }

  async getBookingById(id: number) {
    return this.prisma.booking.findUnique({
      where: { id },
    });
  }

  async updateBooking(id: number, data: UpdateBookingInput) {
    return this.prisma.booking.update({
      where: { id },
      data: {
        status: data.status,
      },
    });
  }

  async deleteBooking(id: number) {
    return this.prisma.booking.delete({
      where: { id },
    });
  }

  async getAllBookings() {
    return this.prisma.booking.findMany();
  }
}