import { Injectable, OnModuleInit, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { connectConsumer, connectProducer, startConsumer, produceMessage } from '../utils/kafka';
import { SearchRideInput } from './dto/ride.dto';
import { RideStatus } from './ride.model';
import { Client } from '@googlemaps/google-maps-services-js';
import { config } from 'dotenv';

@Injectable()
export class RideService implements OnModuleInit {
  private readonly logger = new Logger(RideService.name);
  private readonly googleMapsClient = new Client({});

  constructor(private prisma: PrismaService) {}

  //  Automatically start Kafka Consumer when service initializes
  async onModuleInit() {
    try {
      this.logger.log('🟡 Initializing Kafka Consumer for Ride Service...');
      await connectConsumer();
      await connectProducer();
      await startConsumer(this); 
      this.logger.log(' Kafka Consumer Started Successfully for Ride Service');
    } catch (error) {
      this.logger.error(' Failed to initialize Kafka Consumer:', error);
    }
  }

  //  Create a new ride
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
    street?: string;
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

    const ride = await this.prisma.ride.create({ data });
    
    // Publish event about new ride creation
    await produceMessage('ride-events', {
      type: 'RIDE_CREATED',
      rideId: ride.id,
      driverId: ride.driverId,
      seatsAvailable: ride.seatsAvailable
    });
    
    return ride;
  }

  //  Get all rides
  async getAllRides() {
    return this.prisma.ride.findMany();
  }

  //  Get a ride by ID
  async getRideById(id: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id } });
    if (!ride) {
      throw new NotFoundException(`Ride with ID ${id} not found`);
    }
    return ride;
  }

  //  Update a ride
  async updateRide(id: string, data: Partial<{ 
    origin: string; 
    destination: string; 
    departure: Date; 
    seatsAvailable: number; 
    price: number;
    isGirlsOnly: boolean;
    status: RideStatus;
    bookingDeadline: Date;
    street?: string; 
  }>) {
    const ride = await this.getRideById(id);
    const updatedRide = await this.prisma.ride.update({ where: { id }, data });
    
    // Publish event about ride update if relevant fields changed
    if (data.seatsAvailable !== undefined || 
        data.status !== undefined || 
        data.departure !== undefined || 
        data.bookingDeadline !== undefined) {
      await produceMessage('ride-events', {
        type: 'RIDE_UPDATED',
        rideId: updatedRide.id,
        driverId: updatedRide.driverId,
        seatsAvailable: updatedRide.seatsAvailable,
        status: updatedRide.status
      });
    }
    
    return updatedRide;
  }

  // Delete a ride
  async deleteRide(id: string) {
    const ride = await this.getRideById(id);
    const deletedRide = await this.prisma.ride.delete({ where: { id } });
    
    // Publish event about ride deletion
    await produceMessage('ride-events', {
      type: 'RIDE_DELETED',
      rideId: deletedRide.id,
      driverId: deletedRide.driverId
    });
    
    return deletedRide;
  }

  // Search for rides
  async searchRides(searchParams: SearchRideInput) {
    const { 
      origin, 
      destination, 
      isFromGIU, 
      isToGIU, 
      isGirlsOnly,
      departureDate,
      street 
    } = searchParams;

    // Build the where clause based on search parameters
    const where: any = {
      status: RideStatus.PENDING, // Only show pending rides
    };

    if (origin) where.origin = { contains: origin, mode: 'insensitive' }; 
    if (destination) where.destination = { contains: destination, mode: 'insensitive' }; 
    if (isFromGIU !== undefined) where.isFromGIU = isFromGIU;
    if (isToGIU !== undefined) where.isToGIU = isToGIU;
    if (isGirlsOnly !== undefined) where.isGirlsOnly = isGirlsOnly;
    if (street) where.street = { contains: street, mode: 'insensitive' }; ;

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

  //Get rides offered by a driver
  async getDriverRides(driverId: string) {
    return this.prisma.ride.findMany({
      where: { driverId },
      orderBy: { departure: 'desc' },
    });
  }

  // Update available seats
  async updateAvailableSeats(rideId: string, change: number) {
    const ride = await this.getRideById(rideId);
    
    const newSeatsAvailable = ride.seatsAvailable + change;
    if (newSeatsAvailable < 0) {
      throw new BadRequestException(`Not enough seats available (current: ${ride.seatsAvailable})`);
    }
    
    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: { seatsAvailable: newSeatsAvailable },
    });
    
    // Publish seat availability change event
    await produceMessage('ride-events', {
      type: 'SEATS_UPDATED',
      rideId: updatedRide.id,
      seatsAvailable: updatedRide.seatsAvailable
    });
    
    return updatedRide;
  }
  
  // Verify a booking can be made for this ride
  async verifyRideBooking(rideId: string, bookingId: string) {
    try {
      const ride = await this.getRideById(rideId);
      
      // Check if ride has available seats
      if (ride.seatsAvailable <= 0) {
        // Publish booking verification result
        await produceMessage('booking-responses', {
          type: 'BOOKING_VERIFICATION_FAILED',
          rideId,
          bookingId,
          reason: 'No seats available'
        });
        return false;
      }
      
      // Check if booking deadline has passed
      if (ride.bookingDeadline && new Date(ride.bookingDeadline) < new Date()) {
        await produceMessage('booking-responses', {
          type: 'BOOKING_VERIFICATION_FAILED',
          rideId,
          bookingId,
          reason: 'Booking deadline has passed'
        });
        return false;
      }
      
      // If all checks pass, publish success response
      await produceMessage('booking-responses', {
        type: 'BOOKING_VERIFICATION_SUCCESS',
        rideId,
        bookingId,
        driverId: ride.driverId,
        seatsAvailable: ride.seatsAvailable
      });
      
      return true;
    } catch (error) {
      this.logger.error(`Error verifying booking: ${error.message}`);
      
      // Publish error response
      await produceMessage('booking-responses', {
        type: 'BOOKING_VERIFICATION_FAILED',
        rideId,
        bookingId,
        reason: error.message
      });
      
      return false;
    }
  }
  
  // Handle booking cancellation
  async handleBookingCancellation(rideId: string) {
    try {
      // Increase available seats by 1
      await this.updateAvailableSeats(rideId, 1);
      return true;
    } catch (error) {
      this.logger.error(`Error handling booking cancellation: ${error.message}`);
      return false;
    }
  }
  
  // Handle booking acceptance
  async handleBookingAccepted(rideId: string) {
    try {
      // Decrease available seats by 1
      await this.updateAvailableSeats(rideId, -1);
      this.logger.log(`Seats updated for ride ${rideId} after booking acceptance`);
      return true;
    } catch (error) {
      this.logger.error(`Error handling booking acceptance: ${error.message}`);
      return false;
    }
  }

  //deg2rad function to convert degrees to radians
  deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }

  //function that takes 2 coordinates as input and calculates the distance between them and returns them as output
  async calculateDistance(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
    const R = 6371; // Radius of the Earth in km
    const dLat = this.deg2rad(destination.lat - origin.lat);
    const dLon = this.deg2rad(destination.lng - origin.lng);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(origin.lat)) * Math.cos(this.deg2rad(destination.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  async calculateRoadDistance(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): Promise<number> {
    try {
      const response = await this.googleMapsClient.distancematrix({
        params: {
          origins: [`${origin.lat},${origin.lng}`],
          destinations: [`${destination.lat},${destination.lng}`],
          key: process.env.GOOGLE_MAPS_API_KEY || (() => { throw new Error('GOOGLE_MAPS_API_KEY is not defined in environment variables'); })(), // Ensure API key is defined
        },
      });

      const element = response.data.rows[0].elements[0];
      if (element.status === 'OK' && element.distance) {
        const distanceInMeters = element.distance.value;
        return distanceInMeters / 1000; // Convert meters to kilometers
      } else {
        throw new Error(`Google Maps API error: ${element.status}`);
      }
    } catch (error) {
      this.logger.error(`Error calculating road distance: ${error.message}`);
      throw new BadRequestException('Failed to calculate road distance');
    }
  }

}
