import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class RideService {
  constructor(private prisma: PrismaService) {}

  async createRide(data: { driverId: string; origin: string; destination: string; departure: Date; seatsAvailable: number; price: number }) {
    return this.prisma.ride.create({ data });
  }

  async getAllRides() {
    return this.prisma.ride.findMany();
  }

  async getRideById(id: string) {
    return this.prisma.ride.findUnique({ where: { id } });
  }

  async updateRide(id: string, data: Partial<{ origin: string; destination: string; departure: Date; seatsAvailable: number; price: number }>) {
    return this.prisma.ride.update({ where: { id }, data });
  }

  async deleteRide(id: string) {
    return this.prisma.ride.delete({ where: { id } });
  }
}
