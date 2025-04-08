import { Injectable, OnModuleInit, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ride, RideDocument } from './ride.schema';
import { SearchRideInput } from './dto/ride.dto';
import { RideStatus } from './ride.model';
import { connectConsumer, connectProducer, startConsumer, produceMessage } from '../utils/kafka';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from '@googlemaps/google-maps-services-js';
import { config } from 'dotenv';

@Injectable()
export class RideService implements OnModuleInit {
  private readonly logger = new Logger(RideService.name);
  private readonly googleMapsClient = new Client({});
  private zonesData: any;

  constructor(
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
  ) {
    const zonesPath = path.join(__dirname, '..', '..','..', 'assets', 'zones.json');
    try {
      const rawData = fs.readFileSync(zonesPath, 'utf-8');
      this.logger.log('Successfully loaded zones.json');
      this.zonesData = JSON.parse(rawData);
    } catch (error) {
      this.logger.error(' Failed to load zones.json:', error.message);
      this.zonesData = null;
    }
  }

  async onModuleInit() {
    try {
      this.logger.log('🟡 Initializing Kafka Consumer for Ride Service...');
      await connectConsumer();
      await connectProducer();
      await startConsumer(this); 
      this.logger.log('✅ Kafka Consumer Started Successfully for Ride Service');
    } catch (error) {
      this.logger.error('❌ Failed to initialize Kafka Consumer:', error);
    }
  }

  async createRide(data: Partial<Ride>) {
    if (!data.isFromGIU && !data.isToGIU) {
      throw new BadRequestException('Ride must be either from GIU or to GIU');
    }

    if (!data.departure) {
      throw new BadRequestException('Departure time is required');
    }
  
    if (!data.bookingDeadline) {
      const deadline = new Date(data.departure);
      deadline.setHours(deadline.getHours() - 1);
      data.bookingDeadline = deadline;
    }

    const ride = new this.rideModel(data);
    await ride.save();

    await produceMessage('ride-events', {
      type: 'RIDE_CREATED',
      rideId: ride._id,
      driverId: ride.driverId,
      seatsAvailable: ride.seatsAvailable
    });

    return ride;
  }

  async getAllRides() {
    return this.rideModel.find().exec();
  }

  async getRideById(id: string) {
    const ride = await this.rideModel.findById(id).exec();
    if (!ride) throw new NotFoundException(`Ride with ID ${id} not found`);
    return ride;
  }

  async updateRide(id: string, data: Partial<Ride>) {
    const updated = await this.rideModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!updated) throw new NotFoundException(`Ride with ID ${id} not found`);

    if (data.seatsAvailable !== undefined || data.status || data.departure || data.bookingDeadline) {
      await produceMessage('ride-events', {
        type: 'RIDE_UPDATED',
        rideId: updated._id,
        driverId: updated.driverId,
        seatsAvailable: updated.seatsAvailable,
        status: updated.status
      });
    }

    return updated;
  }

  async deleteRide(id: string) {
    const ride = await this.rideModel.findByIdAndDelete(id).exec();
    if (!ride) throw new NotFoundException(`Ride with ID ${id} not found`);

    await produceMessage('ride-events', {
      type: 'RIDE_DELETED',
      rideId: ride._id,
      driverId: ride.driverId
    });

    return ride;
  }

  async searchRides(searchParams: SearchRideInput) {
    const {
      origin,
      destination,
      isFromGIU,
      isToGIU,
      isGirlsOnly,
      departureDate,
    } = searchParams;

    const filter: any = { status: RideStatus.PENDING };

    if (origin) filter.origin = new RegExp(origin, 'i');
    if (destination) filter.destination = new RegExp(destination, 'i');
    if (isFromGIU !== undefined) filter.isFromGIU = isFromGIU;
    if (isToGIU !== undefined) filter.isToGIU = isToGIU;
    if (isGirlsOnly !== undefined) filter.isGirlsOnly = isGirlsOnly;

    if (departureDate) {
      const start = new Date(departureDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(departureDate);
      end.setHours(23, 59, 59, 999);
      filter.departure = { $gte: start, $lte: end };
    }

    return this.rideModel.find(filter).sort({ departure: 1 }).exec();
  }

  async getDriverRides(driverId: string) {
    return this.rideModel.find({ driverId }).sort({ departure: -1 }).exec();
  }

  async updateAvailableSeats(rideId: string, change: number) {
    const ride = await this.getRideById(rideId);

    const newSeats = ride.seatsAvailable + change;
    if (newSeats < 0) {
      throw new BadRequestException(`Not enough seats available (current: ${ride.seatsAvailable})`);
    }

    ride.seatsAvailable = newSeats;
    await ride.save();

    await produceMessage('ride-events', {
      type: 'SEATS_UPDATED',
      rideId: ride._id,
      seatsAvailable: ride.seatsAvailable
    });

    return ride;
  }

  async verifyRideBooking(rideId: string, bookingId: string) {
    try {
      const ride = await this.getRideById(rideId);

      if (ride.seatsAvailable <= 0) {
        await produceMessage('booking-responses', {
          type: 'BOOKING_VERIFICATION_FAILED',
          rideId,
          bookingId,
          reason: 'No seats available'
        });
        return false;
      }

      if (ride.bookingDeadline && new Date(ride.bookingDeadline) < new Date()) {
        await produceMessage('booking-responses', {
          type: 'BOOKING_VERIFICATION_FAILED',
          rideId,
          bookingId,
          reason: 'Booking deadline has passed'
        });
        return false;
      }

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
      await produceMessage('booking-responses', {
        type: 'BOOKING_VERIFICATION_FAILED',
        rideId,
        bookingId,
        reason: error.message
      });
      return false;
    }
  }

  async handleBookingCancellation(rideId: string) {
    try {
      await this.updateAvailableSeats(rideId, 1);
      return true;
    } catch (error) {
      this.logger.error(`Error handling booking cancellation: ${error.message}`);
      return false;
    }
  }

  async handleBookingAccepted(rideId: string) {
    try {
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
