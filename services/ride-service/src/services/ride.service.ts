import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ride, RideDocument, RideStatus } from '../schemas/ride.schema';
import { CreateRideInput, SearchRideInput, UpdateRideInput, BookingDeadlineInput } from '../dto/ride.dto';
import { RouteService } from './route.service';
import { ZoneService } from './zone.service';
import { connectConsumer, startConsumer, produceMessage } from '../utils/kafka';

// Add fetch API for service communication
import fetch from 'node-fetch';

const logger = new Logger('RideService');

@Injectable()
export class RideService implements OnModuleInit {
  constructor(
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
    private routeService: RouteService,
    private zoneService: ZoneService,
  ) {}

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

    // Filter rides based on route zones
    if (fromZoneId || toZoneId) {
      rides = await Promise.all(
        rides.map(async (ride) => {
          const route = await this.routeService.findById(ride.routeId.toString());
          const stopDetails = await this.routeService.getStopsForRoute(ride.routeId.toString());
          
          // Get the zones of the route in sequence order
          const zoneIds = stopDetails.map(stop => stop.zoneId.toString());
          
          // Check if this is a route to GIU or from GIU
          const isStartFromGIU = route.startFromGIU;
          
          // For routes starting from GIU, fromZoneId should be GIU zone (distance=0) 
          // and toZoneId should be in the route sequence
          if (isStartFromGIU) {
            // Handle "from GIU to Zone" scenario
            if (fromZoneId) {
              // If searching "from" a specific zone, it should be GIU
              const fromZone = await this.zoneService.findById(fromZoneId);
              if (fromZone.distanceFromGIU !== 0) {
                return null; // Not starting from GIU
              }
            }
            
            // If searching "to" a specific zone, it should be in the route
            if (toZoneId && !zoneIds.includes(toZoneId)) {
              return null; // Zone not in route
            }
          } else {
            // Handle "from Zone to GIU" scenario
            if (toZoneId) {
              // If searching "to" a specific zone, it should be GIU
              const toZone = await this.zoneService.findById(toZoneId);
              if (toZone.distanceFromGIU !== 0) {
                return null; // Not ending at GIU
              }
            }
            
            // If searching "from" a specific zone, it should be in the route
            if (fromZoneId && !zoneIds.includes(fromZoneId)) {
              return null; // Zone not in route
            }
          }
          
          return ride;
        })
      );
      
      // Filter out null values (rides that didn't match the zone criteria)
      rides = rides.filter(ride => ride !== null);
    }

    return rides;
  }

  async create(createRideInput: CreateRideInput, driverId: string): Promise<Ride> {
    // Validate that the route exists
    const route = await this.routeService.findById(createRideInput.routeId);
    
    // Ensure that route is either starting from or ending at GIU
    if (!route.startFromGIU && !this.isRouteEndingAtGIU(route)) {
      throw new BadRequestException('Route must either start from or end at GIU');
    }
    
    // Verify the route's zone sequence follows the required direction (zones must get closer to GIU or be at GIU)
    await this.verifyZoneSequence(route);
    
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
    const createdRide = new this.rideModel({
      ...createRideInput,
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
      route: route.name,
      departureTime: savedRide.departureTime,
      availableSeats: savedRide.availableSeats,
      girlsOnly: savedRide.girlsOnly
    });
    
    return savedRide;
  }

  // Helper method to check if a route ends at GIU
  private async isRouteEndingAtGIU(route: any): Promise<boolean> {
    const stops = await this.routeService.getStopsForRoute(route._id.toString());
    const lastStop = stops[stops.length - 1];
    const zone = await this.zoneService.findById(lastStop.zoneId.toString());
    return zone.distanceFromGIU === 0; // GIU has distance = 0
  }
  
  /**
   * Verifies that the zone sequence follows the rule that rides can only go to zones 
   * that are closer to GIU or to GIU itself, not to zones further away from GIU
   */
  private async verifyZoneSequence(route: any): Promise<void> {
    const stops = await this.routeService.getStopsForRoute(route._id.toString());
    
    // Get zones and their distances from GIU for each stop in the route
    const zoneDistances = await Promise.all(
      stops.map(async (stop) => {
        const zone = await this.zoneService.findById(stop.zoneId.toString());
        return {
          zoneId: zone._id.toString(),
          distance: zone.distanceFromGIU,
          sequence: stop.sequence
        };
      })
    );
    
    // Sort by sequence
    zoneDistances.sort((a, b) => a.sequence - b.sequence);
    
    // Check if the route is starting from GIU or going to GIU
    if (route.startFromGIU) {
      // Route starts from GIU, so the first zone should have distance = 0
      if (zoneDistances[0].distance !== 0) {
        throw new BadRequestException('Route starting from GIU must have GIU as the first stop');
      }
      
      // Check that subsequent zones don't get closer to GIU again
      // i.e., distances should increase or stay the same
      for (let i = 1; i < zoneDistances.length; i++) {
        if (zoneDistances[i].distance < zoneDistances[i-1].distance) {
          throw new BadRequestException('Route starting from GIU cannot go back to zones closer to GIU');
        }
      }
    } else {
      // Route ends at GIU, so the last zone should have distance = 0
      if (zoneDistances[zoneDistances.length - 1].distance !== 0) {
        throw new BadRequestException('Route ending at GIU must have GIU as the last stop');
      }
      
      // Check that zones get progressively closer to GIU
      // i.e., distances should decrease or stay the same
      for (let i = 1; i < zoneDistances.length; i++) {
        if (zoneDistances[i].distance > zoneDistances[i-1].distance) {
          throw new BadRequestException('Route ending at GIU must have zones getting progressively closer to GIU');
        }
      }
    }
  }

  async update(id: string, updateRideInput: UpdateRideInput, userId: string): Promise<Ride> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ride ID');
    }
    
    // Find the ride
    const ride = await this.findById(id);
    
    // Check if the user is the driver of the ride
    if (ride.driverId !== userId) {
      throw new BadRequestException('You can only update your own rides');
    }
    
    // Check if the ride is already completed or cancelled
    if (ride.status === RideStatus.COMPLETED || ride.status === RideStatus.CANCELLED) {
      throw new BadRequestException('Cannot update a completed or cancelled ride');
    }
    
    // Handle seat updates
    if (updateRideInput.totalSeats !== undefined) {
      // Cannot decrease total seats below current bookings
      const currentBookings = ride.totalSeats - ride.availableSeats;
      if (updateRideInput.totalSeats < currentBookings) {
        throw new BadRequestException(`Cannot decrease total seats below current bookings (${currentBookings})`);
      }
      
      // Adjust available seats if total seats changed
      if (updateRideInput.availableSeats === undefined) {
        updateRideInput.availableSeats = ride.availableSeats + (updateRideInput.totalSeats - ride.totalSeats);
      }
    }
    
    // Validate available seats
    if (updateRideInput.availableSeats !== undefined) {
      const totalSeats = updateRideInput.totalSeats || ride.totalSeats;
      const currentBookings = totalSeats - ride.availableSeats;
      
      if (updateRideInput.availableSeats < 0) {
        throw new BadRequestException('Available seats cannot be negative');
      }
      
      if (updateRideInput.availableSeats > totalSeats - currentBookings) {
        throw new BadRequestException(`Available seats cannot exceed total seats minus current bookings (${totalSeats - currentBookings})`);
      }
    }
    
    // Update the ride
    const updatedRide = await this.rideModel.findByIdAndUpdate(
      id,
      { $set: updateRideInput },
      { new: true },
    ).exec();
    
    // Publish a ride updated event
    await produceMessage('ride-events', {
      type: 'RIDE_UPDATED',
      rideId: updatedRide._id.toString(),
      driverId: updatedRide.driverId,
      updates: updateRideInput
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

  async getRouteForRide(rideId: string): Promise<any> {
    const ride = await this.findById(rideId);
    return this.routeService.findById(ride.routeId.toString());
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
      
      // Get the route to ensure the new destination is valid
      const route = await this.routeService.findById(ride.routeId.toString());
      const stops = await this.routeService.getStopsForRoute(ride.routeId.toString());
      
      // Get all stops as potential destinations
      const stopNames = stops.map(stop => stop.name);
      
      // Check if the new destination is a valid stop in the route
      if (!stopNames.some(name => name.toLowerCase() === newDropoffLocation.toLowerCase())) {
        throw new BadRequestException(`The destination ${newDropoffLocation} is not a valid stop in this route`);
      }
      
      // If we're here, the destination change is valid
      // We don't need to update anything in our service since the booking service manages this
      // Just publish an event to notify the driver
      await produceMessage('ride-events', {
        type: 'DESTINATION_CHANGED',
        rideId,
        bookingId,
        userId,
        driverId: ride.driverId,
        newDropoffLocation,
        timestamp: new Date().toISOString()
      });
      
      logger.log(`Destination change for booking ${bookingId} on ride ${rideId} processed successfully`);
    } catch (error: any) {
      logger.error(`Failed to process destination change: ${error.message}`);
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
}
