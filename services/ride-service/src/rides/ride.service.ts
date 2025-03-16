import { Injectable, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { connectConsumer, startConsumer, isUserVerified } from '../utils/kafka';

@Injectable()
export class RideService implements OnModuleInit {
  private readonly logger = new Logger(RideService.name);
  private kafkaInitialized = false;

  constructor(private prisma: PrismaService) {}

  // Start Kafka Consumer when service initializes
  async onModuleInit() {
    if (this.kafkaInitialized) {
      this.logger.warn('Kafka Consumer is already initialized. Skipping startup.');
      return;
    }

    try {
      this.logger.log('Initializing Kafka Consumer for Ride Service...');
      await connectConsumer();
      await startConsumer();
      this.kafkaInitialized = true;
      this.logger.log('Kafka Consumer started successfully for Ride Service.');
    } catch (error) {
      this.logger.error('Failed to initialize Kafka Consumer:', error);
    }
  }

  //  Create a new ride (only if driver is verified and either origin or destination is GIU)
  async createRide(data: { driverId: string; origin: string; destination: string; departure: Date; seatsAvailable: number; price: number; isGirlsOnly: boolean }) {
     if (!isUserVerified(data.driverId)) {
      throw new BadRequestException(`User ${data.driverId} is not verified and cannot create rides.`);
    }
  
    // Ensure either origin or destination is "GIU"
    if (data.origin !== 'GIU' && data.destination !== 'GIU') {
      throw new BadRequestException(`A ride must either start from or end at GIU.`);
    }
  
    return this.prisma.ride.create({ data });
  }
  //  Get all rides (optionally filter for girls-only)
  async getAllRides(girlsOnly?: boolean) {
    return this.prisma.ride.findMany({
      where: girlsOnly ? { isGirlsOnly: true } : {},
    });
  }

  //  Search rides going TO GIU
  async searchRidesGoingToGIU() {
    return this.prisma.ride.findMany({
      where: { destination: 'GIU' },
    });
  }

  //  Search rides leaving FROM GIU
  async searchRidesLeavingGIU() {
    return this.prisma.ride.findMany({
      where: { origin: 'GIU' },
    });
  }

  //  Get a ride by ID
  async getRideById(id: string) {
    return this.prisma.ride.findUnique({ where: { id } });
  }

  //  Update a ride
  async updateRide(id: string, data: Partial<{ origin: string; destination: string; departure: Date; seatsAvailable: number; price: number; isGirlsOnly: boolean }>) {
    return this.prisma.ride.update({ where: { id }, data });
  }

  //  Delete a ride
  async deleteRide(id: string) {
    return this.prisma.ride.delete({ where: { id } });
  }
}
