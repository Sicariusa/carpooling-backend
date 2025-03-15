import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { connectConsumer, startConsumer } from '../utils/kafka';

@Injectable()
export class RideService implements OnModuleInit {
  private readonly logger = new Logger(RideService.name);

  constructor(private prisma: PrismaService) {}

  // ✅ Automatically start Kafka Consumer when service initializes
  async onModuleInit() {
    try {
      this.logger.log('🟡 Initializing Kafka Consumer for Ride Service...');
      await connectConsumer();
      await startConsumer(); 
      this.logger.log('✅ Kafka Consumer Started Successfully for Ride Service');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Kafka Consumer:', error);
    }
  }

  // ✅ Create a new ride
  async createRide(data: { driverId: string; origin: string; destination: string; departure: Date; seatsAvailable: number; price: number }) {
    return this.prisma.ride.create({ data });
  }

  // ✅ Get all rides
  async getAllRides() {
    return this.prisma.ride.findMany();
  }

  // ✅ Get a ride by ID
  async getRideById(id: string) {
    return this.prisma.ride.findUnique({ where: { id } });
  }

  // ✅ Update a ride
  async updateRide(id: string, data: Partial<{ origin: string; destination: string; departure: Date; seatsAvailable: number; price: number }>) {
    return this.prisma.ride.update({ where: { id }, data });
  }

  // ✅ Delete a ride
  async deleteRide(id: string) {
    return this.prisma.ride.delete({ where: { id } });
  }
}
