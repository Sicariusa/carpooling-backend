import { Injectable, OnModuleInit, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { connectConsumer, startConsumer } from '../utils/kafka';
import { SearchRideInput } from './dto/ride.dto';
import { RideStatus } from './ride.model';

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
  async createRide(data: { 
    driverId: string; 
    origin: string; 
    destination: string; 
    departure: Date; 
    seatsAvailable: number; 
    price: number;
    isGirlsOnly?: boolean;
    isFromGIU?: boolean;
    isToGIU?: boolean;
    bookingDeadline?: Date;
  }) {
    // Validate that the ride is either from or to GIU
    if (!data.isFromGIU && !data.isToGIU) {
      throw new BadRequestException('Ride must be either from GIU or to GIU');
    }

    // Set default booking deadline if not provided (2 hours before departure)
    if (!data.bookingDeadline) {
      const deadline = new Date(data.departure);
      deadline.setHours(deadline.getHours() - 2);
      data.bookingDeadline = deadline;
    }

    return this.prisma.ride.create({ data });
  }

  // ✅ Get all rides
  async getAllRides() {
    return this.prisma.ride.findMany();
  }

  // ✅ Get a ride by ID
  async getRideById(id: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (!ride) {
      throw new NotFoundException(`Ride with ID ${id} not found`);
    }
    return ride;
  }

  // ✅ Update a ride
  async updateRide(id: string, data: Partial<{ 
    origin: string; 
    destination: string; 
    departure: Date; 
    seatsAvailable: number; 
    price: number;
    isGirlsOnly: boolean;
    status: RideStatus;
    bookingDeadline: Date;
  }>) {
    const ride = await this.getRideById(id);
    return this.prisma.ride.update({ where: { id }, data });
  }

  // ✅ Delete a ride
  async deleteRide(id: string) {
    await this.getRideById(id);
    return this.prisma.ride.delete({ where: { id } });
  }

  // ✅ Search for rides
  async searchRides(searchParams: SearchRideInput) {
    const { 
      origin, 
      destination, 
      isFromGIU, 
      isToGIU, 
      isGirlsOnly,
      departureDate 
    } = searchParams;

    // Build the where clause based on search parameters
    const where: any = {
      status: RideStatus.PENDING, // Only show pending rides
    };

    if (origin) where.origin = origin;
    if (destination) where.destination = destination;
    if (isFromGIU !== undefined) where.isFromGIU = isFromGIU;
    if (isToGIU !== undefined) where.isToGIU = isToGIU;
    if (isGirlsOnly !== undefined) where.isGirlsOnly = isGirlsOnly;

    // If departure date is provided, search for rides on that day
    if (departureDate) {
      const startOfDay = new Date(departureDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(departureDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      where.departure = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    return this.prisma.ride.findMany({
      where,
      orderBy: {
        departure: 'asc',
      },
    });
  }

  // ✅ Get rides offered by a driver
  async getDriverRides(driverId: string) {
    return this.prisma.ride.findMany({
      where: { driverId },
      orderBy: { departure: 'desc' },
    });
  }

  // ✅ Update available seats
  async updateAvailableSeats(rideId: string, change: number) {
    const ride = await this.getRideById(rideId);
    
    const newSeatsAvailable = ride.seatsAvailable + change;
    if (newSeatsAvailable < 0) {
      throw new BadRequestException(`Not enough seats available (current: ${ride.seatsAvailable})`);
    }
    
    return this.prisma.ride.update({
      where: { id: rideId },
      data: { seatsAvailable: newSeatsAvailable },
    });
  }

}
