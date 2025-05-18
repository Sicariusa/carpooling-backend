import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ride, RideDocument, RideStatus } from '../schemas/ride.schema';
import { CreateRideInput, SearchRideInput, UpdateRideInput, BookingDeadlineInput, ModifyDestinationInput } from '../dto/ride.dto';
import { StopService } from './stop.service';
import { ZoneService } from './zone.service';
import { connectConsumer, startConsumer, produceMessage } from '../utils/kafka';
import { Client } from '@googlemaps/google-maps-services-js';
import { Server } from 'socket.io';

// Add fetch API for service communication
import fetch from 'node-fetch';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('RideService');

@Injectable()
export class RideService implements OnModuleInit {

  private readonly googleMapsClient = new Client({});
  private readonly socketServer: Server;
  private readonly logger = new Logger(RideService.name);

  constructor(
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
    private stopService: StopService,
    private zoneService: ZoneService,
    private readonly configService: ConfigService,
  ) {
    // Initialize WebSocket server
    this.socketServer = new Server(3005, {
      cors: {
        origin: '*',
      },
    });

    this.socketServer.on('connection', (socket) => {
      this.logger.log(`Client connected: ${socket.id}`);
      socket.on('disconnect', () => {
        this.logger.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  async onModuleInit() {
    try {
      await connectConsumer();
      await startConsumer(this);
      logger.log('Kafka consumer initialized');
    } catch (error: any) {
      logger.error(`Kafka consumer init failed: ${error.message}`);
    }
  }

  async findAll(): Promise<Ride[]> {
    return this.rideModel.find({
      status: { $in: [RideStatus.SCHEDULED, RideStatus.ACTIVE] }
    }).exec();
  }

  async findById(id: string): Promise<Ride> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ride ID');
    }

    const ride = await this.rideModel.findById(id).exec();
    if (!ride) {
      throw new NotFoundException(`Ride with ID ${id} not found`);
    }

    return ride;
  }

  async findByDriver(driverId: string): Promise<Ride[]> {
    return this.rideModel.find({ driverId }).sort({ departureTime: -1 }).exec();
  }

  //find the driver's active rides
  async findActiveRides(driverId: string): Promise<Ride[]> {

    console.log(await this.rideModel.find({driverId, status: { $in: [RideStatus.ACTIVE] }}).exec());

    return this.rideModel.find({
      driverId,
      status: { $in: [RideStatus.ACTIVE] }
    }).exec();
  }

  //find the driver's scheduled rides
  async findScheduledRides(driverId: string): Promise<Ride[]> {
    console.log(await this.rideModel.find({driverId, status: { $in: [RideStatus.SCHEDULED] }}).exec()); 
    return this.rideModel.find({
      driverId,
      status: { $in: [RideStatus.SCHEDULED] }
    }).exec();
  }

  async searchRides(searchInput: SearchRideInput): Promise<Ride[]> {
    const {
      fromZoneId,
      toZoneId,
      departureDate,
      girlsOnly,
      minAvailableSeats = 1,
      maxPrice
    } = searchInput;
  
    // Create a base query
    const query: any = {
      status: { $in: [RideStatus.SCHEDULED, RideStatus.ACTIVE] },
      availableSeats: { $gte: minAvailableSeats }
    };
  
    // Add price filter if specified
    if (maxPrice !== undefined) {
      query.pricePerSeat = { $lte: maxPrice };
    }
  
    // Add girlsOnly filter if specified
    if (girlsOnly !== undefined) {
      query.girlsOnly = girlsOnly;
    }
  
    // Add departure date filter if specified
    if (departureDate) {
      const startOfDay = new Date(departureDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(departureDate);
      endOfDay.setHours(23, 59, 59, 999);

      query.departureTime = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }
  
    // Get all rides that match the basic criteria
    let rides = await this.rideModel.find(query).exec();
  
    // Filter rides based on fromZoneId and toZoneId
    rides = await Promise.all(
      rides.map(async (ride) => {
        // Get the stop details for this ride
        const stopIds = ride.stops.map(stop => stop.stopId);
        const stops = await Promise.all(
          stopIds.map(stopId => this.stopService.findById(stopId.toString()))
        );
  
        // Order stops by sequence
        const orderedStops = [...ride.stops]
          .sort((a, b) => a.sequence - b.sequence)
          .map(orderedStop => {
            return stops.find(s => s._id.toString() === orderedStop.stopId.toString());
          });
  
        // Get the first and last zones
        const firstZone = orderedStops[0]?.zoneId.toString();
        const lastZone = orderedStops[orderedStops.length - 1]?.zoneId.toString();
  
        // Apply fromZoneId filter
        if (fromZoneId && firstZone !== fromZoneId) {
          return null; // Exclude rides that don't start from the desired zone
        }
  
        // Apply toZoneId filter
        if (toZoneId && lastZone !== toZoneId) {
          return null; // Exclude rides that don't end at the desired zone
        }
  
        return ride;
      })
    );
  
    // Filter out null values (rides that didn't match the criteria)
    rides = rides.filter(ride => ride !== null);
  
    return rides;
  }

  async create(createRideInput: CreateRideInput, driverId: string): Promise<Ride> {
    // Validate all stops exist and are in correct order
    const stopIds = createRideInput.stops.map(stop => stop.stopId);

    // Fetch all stops to validate them
    const stops = await Promise.all(
      stopIds.map(async stopId => {
        if (!Types.ObjectId.isValid(stopId)) {
          throw new BadRequestException(`Invalid stop ID: ${stopId}`);
        }
        return this.stopService.findById(stopId);
      })
    );

    // Get zones for all stops
    const zoneIds = await Promise.all(
      stops.map(async stop => {
        return stop.zoneId.toString();
      })
    );

    const zones = await Promise.all(
      zoneIds.map(zoneId => this.zoneService.findById(zoneId))
    );

    // Order stops by sequence
    const orderedStops = [...createRideInput.stops]
      .sort((a, b) => a.sequence - b.sequence);

    const orderedZones = orderedStops.map((stopInput, index) => {
      const stopIndex = stopIds.indexOf(stopInput.stopId);
      return zones[stopIndex];
    });

    // Verify either first or last stop is at GIU
    const firstZone = orderedZones[0];
    const lastZone = orderedZones[orderedZones.length - 1];

    const hasGIUAtEnds = (firstZone.distanceFromGIU === 0) || (lastZone.distanceFromGIU === 0);
    if (!hasGIUAtEnds) {
      throw new BadRequestException('Ride must have GIU as either the first or last stop');
    }

    // Set startFromGIU based on the ride direction
    const startFromGIU = firstZone.distanceFromGIU === 0;

    // If starting from GIU, ensure zones get progressively further from GIU
    // If ending at GIU, ensure zones get progressively closer to GIU
    if (startFromGIU) {
      // When starting from GIU, distances should increase
      for (let i = 1; i < orderedZones.length; i++) {
        if (orderedZones[i].distanceFromGIU < orderedZones[i - 1].distanceFromGIU) {
          throw new BadRequestException(
            'When starting from GIU, stops must be in order of increasing distance from GIU'
          );
        }
      }
    } else {
      // When ending at GIU, distances should decrease
      for (let i = 1; i < orderedZones.length; i++) {
        if (orderedZones[i].distanceFromGIU > orderedZones[i - 1].distanceFromGIU) {
          throw new BadRequestException(
            'When ending at GIU, stops must be in order of decreasing distance from GIU'
          );
        }
      }
    }

    // Ensure total seats and available seats are valid
    if (createRideInput.totalSeats < 1) {
      throw new BadRequestException('Total seats must be at least 1');
    }

    if (createRideInput.availableSeats > createRideInput.totalSeats) {
      throw new BadRequestException('Available seats cannot exceed total seats');
    }

    // Ensure the departure time is in the future
    const currentDate = new Date();
    if (new Date(createRideInput.departureTime) <= currentDate) {
      throw new BadRequestException('Departure time must be in the future');
    }

    // Create the ride
    const formattedStops = createRideInput.stops.map(stop => ({
      stopId: new Types.ObjectId(stop.stopId),
      latitude: stop.latitude,
      longitude: stop.longitude,
      location: stop.location,
      sequence: stop.sequence
    }));

    const createdRide = new this.rideModel({
      ...createRideInput,
      stops: formattedStops,
      startFromGIU,
      driverId,
      status: RideStatus.SCHEDULED,
      bookingIds: [],
      // Set default booking deadline to 30 minutes before departure if not specified
      bookingDeadline: createRideInput.departureTime
        ? new Date(new Date(createRideInput.departureTime).getTime() - 30 * 60000)
        : undefined
    });

    const savedRide = await createdRide.save();

    // Publish a ride created event
    await produceMessage('ride-events', {
      type: 'RIDE_CREATED',
      rideId: savedRide._id.toString(),
      driverId,
      startLocation: savedRide.startLocation,
      endLocation: savedRide.endLocation,
      departureTime: savedRide.departureTime,
      stops: savedRide.stops,
      girlsOnly: savedRide.girlsOnly,
      availableSeats: savedRide.availableSeats,
      totalSeats: savedRide.totalSeats,
      pricePerSeat: savedRide.pricePerSeat,
      priceScale: savedRide.priceScale
    });

    return savedRide;
  }

  async update(id: string, updateRideInput: UpdateRideInput, userId: string): Promise<Ride> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ride ID');
    }

    // Verify the ride exists and the user is the driver
    const ride = await this.findById(id);
    if (ride.driverId !== userId) {
      throw new BadRequestException('Only the ride driver can update the ride');
    }

    // Check if we're updating stops
    if (updateRideInput.stops && updateRideInput.stops.length > 0) {
      // Validate all stops exist and are in correct order
      const stopIds = updateRideInput.stops.map(stop => stop.stopId);

      // Fetch all stops to validate them
      const stops = await Promise.all(
        stopIds.map(async stopId => {
          if (!Types.ObjectId.isValid(stopId)) {
            throw new BadRequestException(`Invalid stop ID: ${stopId}`);
          }
          return this.stopService.findById(stopId);
        })
      );

      // Get zones for all stops
      const zoneIds = await Promise.all(
        stops.map(async stop => {
          return stop.zoneId.toString();
        })
      );

      const zones = await Promise.all(
        zoneIds.map(zoneId => this.zoneService.findById(zoneId))
      );

      // Order stops by sequence
      const orderedStops = [...updateRideInput.stops]
        .sort((a, b) => a.sequence - b.sequence);

      const orderedZones = orderedStops.map((stopInput, index) => {
        const stopIndex = stopIds.indexOf(stopInput.stopId);
        return zones[stopIndex];
      });

      // Verify either first or last stop is at GIU
      const firstZone = orderedZones[0];
      const lastZone = orderedZones[orderedZones.length - 1];

      const hasGIUAtEnds = (firstZone.distanceFromGIU === 0) || (lastZone.distanceFromGIU === 0);
      if (!hasGIUAtEnds) {
        throw new BadRequestException('Ride must have GIU as either the first or last stop');
      }

      // Set startFromGIU based on the ride direction
      const startFromGIU = firstZone.distanceFromGIU === 0;

      // If starting from GIU, ensure zones get progressively further from GIU
      // If ending at GIU, ensure zones get progressively closer to GIU
      if (startFromGIU) {
        // When starting from GIU, distances should increase
        for (let i = 1; i < orderedZones.length; i++) {
          if (orderedZones[i].distanceFromGIU < orderedZones[i - 1].distanceFromGIU) {
            throw new BadRequestException(
              'When starting from GIU, stops must be in order of increasing distance from GIU'
            );
          }
        }
      } else {
        // When ending at GIU, distances should decrease
        for (let i = 1; i < orderedZones.length; i++) {
          if (orderedZones[i].distanceFromGIU > orderedZones[i - 1].distanceFromGIU) {
            throw new BadRequestException(
              'When ending at GIU, stops must be in order of decreasing distance from GIU'
            );
          }
        }
      }

      // Format stops for MongoDB
      const formattedStops = updateRideInput.stops.map(stop => ({
        stopId: new Types.ObjectId(stop.stopId),
        latitude: stop.latitude,
        longitude: stop.longitude,
        location: stop.location,
        sequence: stop.sequence
      }));

      // Add to update data
      const { stops: rideStops, ...restInput } = updateRideInput;

      // Then update with a new object that has formatted stops
      const updatedInput = {
        ...restInput,
        stops: formattedStops,
        startFromGIU
      };

      // Use the updatedInput for the database update
      const updatedRide = await this.rideModel.findByIdAndUpdate(
        id,
        { $set: updatedInput },
        { new: true }
      ).exec();

      if (!updatedRide) {
        throw new NotFoundException(`Ride with ID ${id} not found`);
      }

      // Publish a ride updated event
      await produceMessage('ride-events', {
        type: 'RIDE_UPDATED',
        rideId: updatedRide._id.toString(),
        driverId: updatedRide.driverId,
        changes: Object.keys(updatedInput)
      });

      return updatedRide;
    }

    // If updating seats, validate
    if (updateRideInput.totalSeats !== undefined && updateRideInput.totalSeats < 1) {
      throw new BadRequestException('Total seats must be at least 1');
    }

    if (updateRideInput.availableSeats !== undefined &&
      updateRideInput.totalSeats !== undefined &&
      updateRideInput.availableSeats > updateRideInput.totalSeats) {
      throw new BadRequestException('Available seats cannot exceed total seats');
    }

    // If updating departure time, ensure it's in the future
    if (updateRideInput.departureTime) {
      const currentDate = new Date();
      if (new Date(updateRideInput.departureTime) <= currentDate) {
        throw new BadRequestException('Departure time must be in the future');
      }
    }

    const updatedRide = await this.rideModel.findByIdAndUpdate(
      id,
      { $set: updateRideInput },
      { new: true }
    ).exec();

    if (!updatedRide) {
      throw new NotFoundException(`Ride with ID ${id} not found`);
    }

    // Publish a ride updated event
    await produceMessage('ride-events', {
      type: 'RIDE_UPDATED',
      rideId: updatedRide._id.toString(),
      driverId: updatedRide.driverId,
      changes: Object.keys(updateRideInput)
    });

    return updatedRide;
  }

  async cancelRide(id: string, userId: string): Promise<Ride> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ride ID');
    }

    // Find the ride
    const ride = await this.findById(id);

    // Check if the user is the driver of the ride
    if (ride.driverId !== userId) {
      throw new BadRequestException('You can only cancel your own rides');
    }

    // Check if the ride is already completed or cancelled
    if (ride.status === RideStatus.COMPLETED || ride.status === RideStatus.CANCELLED) {
      throw new BadRequestException('Ride is already completed or cancelled');
    }

    // Update the ride status to CANCELLED
    const cancelledRide = await this.rideModel.findByIdAndUpdate(
      id,
      { $set: { status: RideStatus.CANCELLED } },
      { new: true },
    ).exec();

    // Publish a ride cancelled event
    await produceMessage('ride-events', {
      type: 'RIDE_DELETED',
      rideId: cancelledRide._id.toString(),
      driverId: cancelledRide.driverId
    });

    return cancelledRide;
  }

  async setBookingDeadline(rideId: string, minutesBeforeDeparture: number, userId: string): Promise<Ride> {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID');
    }

    // Find the ride
    const ride = await this.findById(rideId);

    // Check if the user is the driver of the ride
    if (ride.driverId !== userId) {
      throw new BadRequestException('You can only set deadline for your own rides');
    }

    // Check if the ride is already completed or cancelled
    if (ride.status === RideStatus.COMPLETED || ride.status === RideStatus.CANCELLED) {
      throw new BadRequestException('Cannot set deadline for completed or cancelled rides');
    }

    // Calculate deadline
    const departureTime = new Date(ride.departureTime);
    const bookingDeadline = new Date(departureTime.getTime() - (minutesBeforeDeparture * 60000));

    // Ensure deadline is in the future
    const currentTime = new Date();
    if (bookingDeadline <= currentTime) {
      throw new BadRequestException('Booking deadline must be in the future');
    }

    // Update the ride
    const updatedRide = await this.rideModel.findByIdAndUpdate(
      rideId,
      { $set: { bookingDeadline } },
      { new: true },
    ).exec();

    // Publish an update event
    await produceMessage('ride-events', {
      type: 'BOOKING_DEADLINE_UPDATED',
      rideId: updatedRide._id.toString(),
      driverId: updatedRide.driverId,
      bookingDeadline
    });

    return updatedRide;
  }

  // Kafka event handlers

  // Called when a booking is created to verify if it's valid
  async verifyRideBooking(bookingId: string, rideId: string, userId: string): Promise<void> {
    logger.log(`Verifying ride booking: ${bookingId} for ride: ${rideId}`);

    try {
      const ride = await this.findById(rideId);

      // Check if booking deadline has passed
      if (ride.bookingDeadline && new Date() > new Date(ride.bookingDeadline)) {
        await produceMessage('booking-events', {
          type: 'BOOKING_REJECTED',
          bookingId,
          rideId,
          userId,
          reason: 'Booking deadline has passed',
          timestamp: new Date().toISOString()
        });
        logger.warn(`Booking ${bookingId} rejected: Booking deadline has passed`);
        return;
      }

      // Check available seats
      if (ride.availableSeats <= 0) {
        await produceMessage('booking-events', {
          type: 'BOOKING_REJECTED',
          bookingId,
          rideId,
          userId,
          reason: 'No available seats',
          timestamp: new Date().toISOString()
        });
        logger.warn(`Booking ${bookingId} rejected: No available seats available`);
        return;
      }

      // If it's a girls-only ride, verify user is female from user service
      if (ride.girlsOnly) {
        // Assume we have a method to verify gender. For now, let's simulate with a placeholder
        // In a real implementation, you would make an HTTP request to the user service
        const isGirlsOnlyEligible = await this.checkUserGender(userId);

        if (!isGirlsOnlyEligible) {
          await produceMessage('booking-events', {
            type: 'BOOKING_REJECTED',
            bookingId,
            rideId,
            userId,
            reason: 'This is a girls-only ride',
            timestamp: new Date().toISOString()
          });
          logger.warn(`Booking ${bookingId} rejected: Girls-only restriction`);
          return;
        }

        
      }
        await this.handleBookingAcceptance(bookingId, rideId, ride.driverId);

      // For driver acceptance flow (if ride requires driver approval)
      // Send notification to driver about the booking request
      await produceMessage('notification-events', {
        type: 'BOOKING_REQUEST',
        recipientId: ride.driverId,
        title: 'New Booking Request',
        message: `You have a new booking request for your ride from ${ride.startLocation} to ${ride.endLocation}`,
        rideId,
        bookingId,
        timestamp: new Date().toISOString()
      });

      logger.log(`Booking verification completed for ${bookingId}. Awaiting driver approval.`);
    } catch (error: any) {
      logger.error(`Error verifying booking: ${error.message}`);
      // Notify booking service of the error
      await produceMessage('booking-events', {
        type: 'BOOKING_REJECTED',
        bookingId,
        rideId,
        userId,
        reason: 'Error processing booking request',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Called when a booking is cancelled
  async handleBookingCancellation(bookingId: string, rideId: string, userId: string): Promise<void> {
    logger.log(`Processing cancellation for booking ${bookingId}`);

    try {
      const ride = await this.findById(rideId);

      // Check if booking is associated with this ride
      if (!ride.bookingIds.includes(bookingId)) {
        logger.warn(`Booking ${bookingId} not found in ride ${rideId}`);
        return;
      }

      // Check if cancellation is before the deadline
      const now = new Date();

      // For example, if there's a cancellation deadline (e.g., 1 hour before departure)
      const cancellationDeadline = new Date(ride.departureTime);
      cancellationDeadline.setHours(cancellationDeadline.getHours() - 1); // 1 hour before departure

      if (now > cancellationDeadline) {
        // Allow the cancellation, but there might be penalties handled by the booking service
        logger.warn(`Late cancellation for booking ${bookingId}, after the cancellation deadline`);

        // You could notify the booking service about the late cancellation
        await produceMessage('booking-events', {
          type: 'LATE_CANCELLATION',
          bookingId,
          rideId,
          userId,
          timestamp: new Date().toISOString()
        });
      }

      // Update ride to increase available seats and remove booking ID
      ride.availableSeats = Math.min(ride.totalSeats, ride.availableSeats + 1);
      ride.bookingIds = ride.bookingIds.filter(id => id !== bookingId);
      await this.rideModel.findByIdAndUpdate(
        rideId,
        {
          availableSeats: ride.availableSeats,
          bookingIds: ride.bookingIds
        }
      );

      // Notify the driver
      await produceMessage('notification-events', {
        type: 'BOOKING_CANCELLED',
        recipientId: ride.driverId,
        title: 'Booking Cancelled',
        message: `A passenger has cancelled their booking for your ride from ${ride.startLocation} to ${ride.endLocation}`,
        rideId,
        bookingId,
        timestamp: new Date().toISOString()
      });

      logger.log(`Cancellation processed for booking ${bookingId}`);
    } catch (error: any) {
      logger.error(`Error processing cancellation: ${error.message}`);
    }
  }

  // Handle booking acceptance
  async handleBookingAcceptance(bookingId: string, rideId: string, driverId: string): Promise<void> {
    logger.log(`Processing booking acceptance: ${bookingId}`);

    try {
      const ride = await this.findById(rideId);

      // Verify this is the ride's driver
      if (ride.driverId !== driverId) {
        logger.warn(`Unauthorized attempt to accept booking ${bookingId} by driver ${driverId}`);
        return;
      }

      // Update available seats and add booking to the ride
      if (ride.availableSeats > 0) {
        const updatedAvailableSeats = ride.availableSeats - 1;
        const updatedBookingIds = [...ride.bookingIds, bookingId];

        await this.rideModel.findByIdAndUpdate(
          rideId,
          {
            availableSeats: updatedAvailableSeats,
            bookingIds: updatedBookingIds
          }
        );

        logger.log(`Booking ${bookingId} accepted and added to ride ${rideId}`);

        // Notify the passenger that booking is confirmed
        await produceMessage('booking-events', {
          type: 'BOOKING_CONFIRMED',
          bookingId,
          rideId,
          driverId,
          timestamp: new Date().toISOString()
        });
      } else {
        logger.warn(`Cannot accept booking ${bookingId}: No seats available`);

        // Notify booking service that acceptance failed
        await produceMessage('booking-events', {
          type: 'BOOKING_ACCEPTANCE_FAILED',
          bookingId,
          rideId,
          driverId,
          reason: 'No seats available',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      logger.error(`Error processing booking acceptance: ${error.message}`);
    }
  }

  // Handle booking rejection
  async handleBookingRejection(bookingId: string, rideId: string, driverId: string): Promise<void> {
    logger.log(`Processing booking rejection for booking ${bookingId}, ride ${rideId}`);

    try {
      // Free up the seat
      const ride = await this.findById(rideId);

      await this.rideModel.findByIdAndUpdate(
        rideId,
        {
          $inc: { availableSeats: 1 },
          $pull: { bookingIds: bookingId }
        }
      );

      // Notify the passenger
      await produceMessage('notification-events', {
        type: 'BOOKING_REJECTED',
        // We don't have the passenger ID here
        rideId,
        bookingId,
        title: 'Booking Rejected',
        message: `Your booking for the ride from ${ride.startLocation} to ${ride.endLocation} has been rejected by the driver`
      });

      logger.log(`Booking rejection processed for ${bookingId}`);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error processing booking rejection: ${errorMessage}`);
    }
  }

  // Handle destination change
  async handleDestinationChange(bookingId: string, rideId: string, userId: string, newDropoffLocation: string): Promise<void> {
    logger.log(`Handling destination change for booking ${bookingId} on ride ${rideId}`);

    try {
      // Verify the ride exists
      const ride = await this.findById(rideId);

      // Verify this booking is associated with this ride
      if (!ride.bookingIds.includes(bookingId)) {
        throw new BadRequestException(`Booking ${bookingId} is not associated with ride ${rideId}`);
      }

      // Get all stops for this ride to validate the new destination
      const stopIds = ride.stops.map(stop => stop.stopId);

      // Get all stops
      const stops = await Promise.all(
        stopIds.map(stopId => this.stopService.findById(stopId.toString()))
      );

      // Get all stop names
      const stopNames = stops.map(stop => stop.name.toLowerCase());

      // Check if the new destination is a valid stop in the route
      if (!stopNames.includes(newDropoffLocation.toLowerCase())) {
        throw new BadRequestException(`The destination ${newDropoffLocation} is not a valid stop in this route`);
      }

      // If we're here, the destination change is valid
      // Just publish an event to notify the driver
      await produceMessage('notification-events', {
        type: 'DESTINATION_CHANGED',
        recipientId: ride.driverId,
        title: 'Dropoff Location Changed',
        message: `A passenger has changed their drop-off location to ${newDropoffLocation}`,
        rideId,
        bookingId,
        userId,
        timestamp: new Date().toISOString()
      });

      // Also notify the booking service that the destination change was processed
      await produceMessage('booking-events', {
        type: 'DESTINATION_CHANGE_APPROVED',
        bookingId,
        rideId,
        userId,
        newDropoffLocation,
        timestamp: new Date().toISOString()
      });

      logger.log(`Destination change for booking ${bookingId} on ride ${rideId} processed successfully`);
    } catch (error: any) {
      logger.error(`Failed to process destination change: ${error.message}`);

      // Notify booking service about the rejection
      await produceMessage('booking-events', {
        type: 'DESTINATION_CHANGE_REJECTED',
        bookingId,
        rideId,
        userId,
        reason: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  // Handle user verification
  async handleUserVerification(userId: string, isDriver: boolean): Promise<void> {
    logger.log(`User ${userId} verified, isDriver: ${isDriver}`);
    // No action needed in the ride service for this event
  }

  // Handle driver approval
  async handleDriverApproval(userId: string): Promise<void> {
    logger.log(`Driver ${userId} approved by admin`);
    // No action needed in the ride service for this event
  }

  // Helper method to check if a user is eligible for girls-only rides
  private async checkUserGender(userId: string): Promise<boolean> {
    try {
      // In a real implementation, make an HTTP request to the user service
      // For now, let's assume we get a response
      const response = await fetch(`${process.env.USER_SERVICE_URL}/api/users/${userId}/gender`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user gender: ${response.statusText}`);
      }

      const data = await response.json();
      return data.gender === 'female'; // True if female, false otherwise
    } catch (error: any) {
      logger.error(`Error checking user gender: ${error.message}`);
      // Default to false for safety
      return false;
    }
  }

  async findRideHistory(userId: string): Promise<Ride[]> {
    logger.log(`Finding ride history for user ${userId}`);

    try {
      // First find all rides where user was a driver
      const driverRides = await this.rideModel.find({
        driverId: userId,
        status: { $in: [RideStatus.COMPLETED, RideStatus.CANCELLED] }
      }).sort({ departureTime: -1 }).exec();

      // Now we need to find all rides where user was a passenger
      // This is more complex as we need to query the booking service
      // For now, we'll make a direct API call
      let passengerRides: Ride[] = [];

      try {
        // Get bookings for this user from booking service
        const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:3002';
        const response = await fetch(`${bookingServiceUrl}/api/bookings/user/${userId}/history`);

        if (response.ok) {
          const bookings = await response.json();

          // Get the ride IDs from the bookings
          const rideIds = bookings.map(booking => booking.rideId);

          // Find all these rides if they exist
          if (rideIds.length > 0) {
            passengerRides = await this.rideModel.find({
              _id: { $in: rideIds },
              status: { $in: [RideStatus.COMPLETED, RideStatus.CANCELLED] }
            }).exec();
          }
        }
      } catch (error: any) {
        logger.error(`Failed to fetch passenger bookings: ${error.message}`);
        // Continue with driver rides only
      }

      // Combine both arrays and sort by departure time (most recent first)
      const allRides = [...driverRides, ...passengerRides];
      return allRides.sort((a, b) =>
        new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime()
      );
    } catch (error: any) {
      logger.error(`Error finding ride history: ${error.message}`);
      return [];
    }
  }

  async findUserBookings(userId: string): Promise<Ride[]> {
    logger.log(`Finding bookings for user ${userId}`);

    try {
      // We need to query the booking service to get this user's bookings
      // For now, we'll make a direct API call
      const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:3002';
      const response = await fetch(`${bookingServiceUrl}/api/bookings/user/${userId}`);

      if (!response.ok) {
        throw new Error(`Booking service returned status ${response.status}`);
      }

      const bookings = await response.json();

      // Get the ride IDs from the bookings
      const rideIds = bookings.map(booking => booking.rideId);

      // Find all these rides
      if (rideIds.length === 0) {
        return [];
      }

      const rides = await this.rideModel.find({
        _id: { $in: rideIds },
        status: { $in: [RideStatus.SCHEDULED, RideStatus.ACTIVE] }
      }).exec();

      // Sort by departure time (soonest first)
      return rides.sort((a, b) =>
        new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
      );
    } catch (error: any) {
      logger.error(`Error finding user bookings: ${error.message}`);
      return [];
    }
  }

  // Modify calculateFareForBooking method to handle error properly
  async calculateFareForBooking(rideId: string, pickupStopId: string, dropoffStopId: string): Promise<number> {
    try {
      const ride = await this.findById(rideId);

      // Find the pickup and dropoff stops in the ride's stops array
      const rideStops = ride.stops.sort((a, b) => a.sequence - b.sequence);

      const pickupStop = rideStops.find(stop => stop.stopId.toString() === pickupStopId);
      const dropoffStop = rideStops.find(stop => stop.stopId.toString() === dropoffStopId);

      if (!pickupStop || !dropoffStop) {
        throw new BadRequestException('Invalid pickup or dropoff stop for this ride');
      }

      // Get stop details
      const pickupStopDetails = await this.stopService.findById(pickupStopId);
      const dropoffStopDetails = await this.stopService.findById(dropoffStopId);

      if (!pickupStopDetails || !dropoffStopDetails) {
        throw new BadRequestException('Stop details not found');
      }

      // Get the zones for these stops
      const pickupZone = await this.zoneService.findById(pickupStopDetails.zoneId.toString());
      const dropoffZone = await this.zoneService.findById(dropoffStopDetails.zoneId.toString());

      // Determine if the pickup is before dropoff based on the ride direction
      const isStartFromGIU = ride.startFromGIU;

      // Logic fix: 
      // If ride starts from GIU, passengers should move from lower sequence to higher sequence
      // If ride ends at GIU, passengers should move from lower sequence to higher sequence as well
      // (The sequence numbers should always increase in the direction of travel, regardless of startFromGIU)
      const isPickupBeforeDropoff = pickupStop.sequence < dropoffStop.sequence;

      if (!isPickupBeforeDropoff) {
        throw new BadRequestException('Pickup must be before dropoff in the route direction');
      }

      // Calculate base fare
      const baseFare = ride.pricePerSeat;

      // Calculate distance factor based on how far each stop is from GIU
      let distanceFactor = 1.0;

      if (isStartFromGIU) {
        // When starting from GIU, the price scales based on how far the dropoff is
        distanceFactor = 1.0 + (dropoffZone.distanceFromGIU / 10) * (ride.priceScale - 1);
      } else {
        // When ending at GIU, the price scales based on how far the pickup is
        distanceFactor = 1.0 + (pickupZone.distanceFromGIU / 10) * (ride.priceScale - 1);
      }

      // Calculate final fare
      const finalFare = baseFare * distanceFactor;

      return Math.round(finalFare * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error calculating fare: ${error.message}`);
      } else {
        logger.error('Unknown error calculating fare');
      }
      throw error;
    }
  }

  // Modify notifyBookingService to handle error properly
  private async notifyBookingService(action: string, data: any): Promise<void> {
    try {
      const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:3003';
      const endpoint = `${bookingServiceUrl}/api/bookings/notify`;

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          data
        }),
      });

      logger.log(`Booking service notified: ${action}`);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Failed to notify booking service: ${error.message}`);
      } else {
        logger.error('Unknown error notifying booking service');
      }
    }
  }

  // Add the setGirlsOnly method to handle girls-only flag separately
  async setGirlsOnly(id: string, girlsOnly: boolean, userId: string): Promise<Ride> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ride ID');
    }

    // Verify the ride exists and the user is the driver
    const ride = await this.findById(id);
    if (ride.driverId !== userId) {
      throw new BadRequestException('Only the ride driver can update the ride');
    }

    // Update only the girlsOnly field
    const updatedRide = await this.rideModel.findByIdAndUpdate(
      id,
      { $set: { girlsOnly } },
      { new: true }
    ).exec();

    if (!updatedRide) {
      throw new NotFoundException(`Ride with ID ${id} not found`);
    }

    // Publish a girls-only status update event
    await produceMessage('ride-events', {
      type: 'RIDE_GIRLS_ONLY_UPDATED',
      rideId: updatedRide._id.toString(),
      driverId: updatedRide.driverId,
      girlsOnly: updatedRide.girlsOnly,
      bookingIds: updatedRide.bookingIds
    });

    return updatedRide;
  }

  // Add accept booking request method
  async acceptBookingRequest(bookingId: string, rideId: string, userId: string): Promise<Ride> {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID');
    }

    // Verify the ride exists and the user is the driver
    const ride = await this.findById(rideId);
    if (ride.driverId !== userId) {
      throw new BadRequestException('Only the ride driver can accept booking requests');
    }

    // Check available seats
    if (ride.availableSeats <= 0) {
      throw new BadRequestException('No available seats remaining for this ride');
    }

    // Update ride to reduce available seats and add booking ID
    const updatedRide = await this.rideModel.findByIdAndUpdate(
      rideId,
      {
        $inc: { availableSeats: -1 },
        $push: { bookingIds: bookingId }
      },
      { new: true }
    ).exec();

    if (!updatedRide) {
      throw new NotFoundException(`Ride with ID ${rideId} not found`);
    }

    // Notify booking service about acceptance
    await produceMessage('booking-events', {
      type: 'BOOKING_ACCEPTED',
      bookingId,
      rideId,
      driverId: userId,
      remainingSeats: updatedRide.availableSeats,
      timestamp: new Date().toISOString()
    });

    return updatedRide;
  }

  // Add reject booking request method
  async rejectBookingRequest(bookingId: string, rideId: string, userId: string): Promise<Ride> {
    if (!Types.ObjectId.isValid(rideId)) {
      throw new BadRequestException('Invalid ride ID');
    }

    // Verify the ride exists and the user is the driver
    const ride = await this.findById(rideId);
    if (ride.driverId !== userId) {
      throw new BadRequestException('Only the ride driver can reject booking requests');
    }

    // Check if booking is in the ride's bookingIds
    if (ride.bookingIds.includes(bookingId)) {
      // If it is, remove it and increase available seats
      await this.rideModel.findByIdAndUpdate(
        rideId,
        {
          $pull: { bookingIds: bookingId },
          $inc: { availableSeats: 1 }
        }
      );
    }

    // Notify booking service about rejection
    await produceMessage('booking-events', {
      type: 'BOOKING_REJECTED',
      bookingId,
      rideId,
      driverId: userId,
      reason: 'Rejected by driver',
      timestamp: new Date().toISOString()
    });

    // Return updated ride
    return this.findById(rideId);
  }

  // Add modify dropoff location method
  async modifyDropoffLocation(bookingId: string, rideId: string, userId: string, newDropoffLocation: string): Promise<boolean> {
    try {
      if (!Types.ObjectId.isValid(rideId)) {
        throw new BadRequestException('Invalid ride ID');
      }

      // Verify the ride exists
      const ride = await this.findById(rideId);

      // Get all stops for this ride to validate the new location
      const stopIds = ride.stops.map(stop => stop.stopId);
      const stops = await Promise.all(
        stopIds.map(stopId => this.stopService.findById(stopId.toString()))
      );

      // Check if the new location matches any stop name
      const validStopNames = stops.map(stop => stop.name.toLowerCase());
      if (!validStopNames.includes(newDropoffLocation.toLowerCase())) {
        throw new BadRequestException(`The destination ${newDropoffLocation} is not a valid stop in this route`);
      }

      // Send the request to the booking service
      await produceMessage('booking-events', {
        type: 'BOOKING_DESTINATION_MODIFIED',
        bookingId,
        rideId,
        userId,
        newDropoffLocation,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error modifying dropoff location: ${error.message}`);
      } else {
        logger.error('Unknown error modifying dropoff location');
      }
      return false;
    }
  }

  // Add these methods to handle payment events
  async handlePaymentCompleted(bookingId: string, rideId: string, userId: string): Promise<void> {
    logger.log(`Payment completed for booking ${bookingId}, ride ${rideId}`);

    try {
      // Notify the driver
      const ride = await this.findById(rideId);

      await produceMessage('notification-events', {
        type: 'PAYMENT_COMPLETED',
        recipientId: ride.driverId,
        title: 'Payment Received',
        message: `Payment for booking ${bookingId} has been completed successfully`,
        rideId,
        bookingId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error handling payment completion: ${error.message}`);
      } else {
        logger.error('Unknown error handling payment completion');
      }
    }
  }

  async handlePaymentFailed(bookingId: string, rideId: string, userId: string): Promise<void> {
    logger.log(`Payment failed for booking ${bookingId}, ride ${rideId}`);

    try {
      // Possibly release the seat or notify the driver
      const ride = await this.findById(rideId);

      await produceMessage('notification-events', {
        type: 'PAYMENT_FAILED',
        recipientId: ride.driverId,
        title: 'Payment Failed',
        message: `Payment for booking ${bookingId} has failed. The passenger may try again.`,
        rideId,
        bookingId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error handling payment failure: ${error.message}`);
      } else {
        logger.error('Unknown error handling payment failure');
      }
    }
  }

  // Add this method to get stop details
  async getStopDetails(stopId: string): Promise<any> {
    try {
      return this.stopService.findById(stopId);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting stop details: ${error.message}`);
      } else {
        logger.error('Unknown error getting stop details');
      }
      throw error;
    }
  }

  async calculateRoadDistance(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<number> {
    try {
      const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
      console.log('APIkey: ', apiKey)
      const response = await this.googleMapsClient.distancematrix({
        params: {
          origins: [`${origin.lat},${origin.lng}`],
          destinations: [`${destination.lat},${destination.lng}`],
          key: apiKey,
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
      console.log(error)
      if (error instanceof Error) {
        this.logger.error(`Error calculating road distance: ${error.message}`);
      } else {
        this.logger.error('Error calculating road distance: Unknown error');
      }
      throw new BadRequestException('Failed to calculate road distance');
    }
  }

  async calculateETA(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<number> {
    try {
      const response = await this.googleMapsClient.directions({
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
      });

      const route = response.data.routes[0];
      if (route && route.legs[0]) {
        const durationInSeconds = route.legs[0].duration.value;
        return Math.ceil(durationInSeconds / 60); // Convert seconds to minutes
      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error calculating ETA: ${error.message}`);
      } else {
        this.logger.error('Error calculating ETA: Unknown error');
      }
      throw new Error('Failed to calculate ETA');
    }
  }

  trackDriverLocation(driverId: string, location: { lat: number; lng: number }) {
    this.socketServer.emit('driverLocationUpdate', { driverId, location });
    this.logger.log(`Driver ${driverId} location updated: ${JSON.stringify(location)}`);
  }

  async findRidesByZone(zoneId: string): Promise<Ride[]> {
    return this.rideModel.find({ 'stops.zoneId': zoneId }).exec();
  }
}
