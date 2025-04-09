"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const ride_schema_1 = require("../schemas/ride.schema");
const route_service_1 = require("./route.service");
const zone_service_1 = require("./zone.service");
const kafka_1 = require("../utils/kafka");
const node_fetch_1 = require("node-fetch");
const logger = new common_1.Logger('RideService');
let RideService = class RideService {
    constructor(rideModel, routeService, zoneService) {
        this.rideModel = rideModel;
        this.routeService = routeService;
        this.zoneService = zoneService;
    }
    async onModuleInit() {
        try {
            await (0, kafka_1.connectConsumer)();
            await (0, kafka_1.startConsumer)(this);
            logger.log('Kafka consumer initialized');
        }
        catch (error) {
            logger.error(`Kafka consumer init failed: ${error.message}`);
        }
    }
    async findAll() {
        return this.rideModel.find({
            status: { $in: [ride_schema_1.RideStatus.SCHEDULED, ride_schema_1.RideStatus.ACTIVE] }
        }).exec();
    }
    async findById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid ride ID');
        }
        const ride = await this.rideModel.findById(id).exec();
        if (!ride) {
            throw new common_1.NotFoundException(`Ride with ID ${id} not found`);
        }
        return ride;
    }
    async findByDriver(driverId) {
        return this.rideModel.find({ driverId }).sort({ departureTime: -1 }).exec();
    }
    async searchRides(searchInput) {
        const { fromZoneId, toZoneId, departureDate, girlsOnly, minAvailableSeats = 1, maxPrice } = searchInput;
        const query = {
            status: { $in: [ride_schema_1.RideStatus.SCHEDULED, ride_schema_1.RideStatus.ACTIVE] },
            availableSeats: { $gte: minAvailableSeats }
        };
        if (maxPrice !== undefined) {
            query.pricePerSeat = { $lte: maxPrice };
        }
        if (girlsOnly !== undefined) {
            query.girlsOnly = girlsOnly;
        }
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
        let rides = await this.rideModel.find(query).exec();
        if (fromZoneId || toZoneId) {
            rides = await Promise.all(rides.map(async (ride) => {
                const route = await this.routeService.findById(ride.routeId.toString());
                const stopDetails = await this.routeService.getStopsForRoute(ride.routeId.toString());
                const zoneIds = stopDetails.map(stop => stop.zoneId.toString());
                const isStartFromGIU = route.startFromGIU;
                if (isStartFromGIU) {
                    if (fromZoneId) {
                        const fromZone = await this.zoneService.findById(fromZoneId);
                        if (fromZone.distanceFromGIU !== 0) {
                            return null;
                        }
                    }
                    if (toZoneId && !zoneIds.includes(toZoneId)) {
                        return null;
                    }
                }
                else {
                    if (toZoneId) {
                        const toZone = await this.zoneService.findById(toZoneId);
                        if (toZone.distanceFromGIU !== 0) {
                            return null;
                        }
                    }
                    if (fromZoneId && !zoneIds.includes(fromZoneId)) {
                        return null;
                    }
                }
                return ride;
            }));
            rides = rides.filter(ride => ride !== null);
        }
        return rides;
    }
    async create(createRideInput, driverId) {
        const route = await this.routeService.findById(createRideInput.routeId);
        if (!route.startFromGIU && !this.isRouteEndingAtGIU(route)) {
            throw new common_1.BadRequestException('Route must either start from or end at GIU');
        }
        await this.verifyZoneSequence(route);
        if (createRideInput.totalSeats < 1) {
            throw new common_1.BadRequestException('Total seats must be at least 1');
        }
        if (createRideInput.availableSeats > createRideInput.totalSeats) {
            throw new common_1.BadRequestException('Available seats cannot exceed total seats');
        }
        const currentDate = new Date();
        if (new Date(createRideInput.departureTime) <= currentDate) {
            throw new common_1.BadRequestException('Departure time must be in the future');
        }
        const createdRide = new this.rideModel({
            ...createRideInput,
            driverId,
            status: ride_schema_1.RideStatus.SCHEDULED,
            bookingIds: [],
            bookingDeadline: createRideInput.departureTime
                ? new Date(new Date(createRideInput.departureTime).getTime() - 30 * 60000)
                : undefined
        });
        const savedRide = await createdRide.save();
        await (0, kafka_1.produceMessage)('ride-events', {
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
    async isRouteEndingAtGIU(route) {
        const stops = await this.routeService.getStopsForRoute(route._id.toString());
        const lastStop = stops[stops.length - 1];
        const zone = await this.zoneService.findById(lastStop.zoneId.toString());
        return zone.distanceFromGIU === 0;
    }
    async verifyZoneSequence(route) {
        const stops = await this.routeService.getStopsForRoute(route._id.toString());
        if (stops.length < 2) {
            throw new common_1.BadRequestException('Route must have at least 2 stops');
        }
        const giuZones = await this.zoneService.findZonesWithDistanceZero();
        const giuZoneIds = giuZones.map(zone => zone._id.toString());
        const stopZones = await Promise.all(stops.map(async (stop) => {
            const stopData = await this.routeService.getStopDetails(stop.stopId);
            return await this.zoneService.findById(stopData.zoneId.toString());
        }));
        const hasGIUStop = stopZones.some(zone => zone.distanceFromGIU === 0);
        if (!hasGIUStop) {
            throw new common_1.BadRequestException('Route must have at least one stop at GIU');
        }
        if (route.startFromGIU) {
            const firstStopZone = stopZones[0];
            if (firstStopZone.distanceFromGIU !== 0) {
                throw new common_1.BadRequestException('For routes starting from GIU, the first stop must be at GIU');
            }
            for (let i = 1; i < stopZones.length; i++) {
                if (stopZones[i].distanceFromGIU < stopZones[i - 1].distanceFromGIU) {
                    throw new common_1.BadRequestException('For routes starting from GIU, each stop must be at the same or further distance from GIU than the previous stop');
                }
            }
        }
        else {
            const lastStopZone = stopZones[stopZones.length - 1];
            if (lastStopZone.distanceFromGIU !== 0) {
                throw new common_1.BadRequestException('For routes ending at GIU, the last stop must be at GIU');
            }
            for (let i = 1; i < stopZones.length; i++) {
                if (stopZones[i].distanceFromGIU > stopZones[i - 1].distanceFromGIU) {
                    throw new common_1.BadRequestException('For routes ending at GIU, each stop must be at the same or closer distance to GIU than the previous stop');
                }
            }
        }
    }
    async update(id, updateRideInput, userId) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid ride ID');
        }
        const ride = await this.rideModel.findById(id).exec();
        if (!ride) {
            throw new common_1.NotFoundException(`Ride with ID ${id} not found`);
        }
        if (ride.driverId !== userId) {
            throw new common_1.BadRequestException('You do not have permission to update this ride');
        }
        if (ride.status === ride_schema_1.RideStatus.COMPLETED || ride.status === ride_schema_1.RideStatus.CANCELLED) {
            throw new common_1.BadRequestException('Cannot update a completed or cancelled ride');
        }
        const hasPriceChanges = (updateRideInput.pricePerSeat !== undefined && updateRideInput.pricePerSeat !== ride.pricePerSeat) ||
            (updateRideInput.priceScale !== undefined && updateRideInput.priceScale !== ride.priceScale);
        if (updateRideInput.availableSeats !== undefined &&
            updateRideInput.totalSeats !== undefined &&
            updateRideInput.availableSeats > updateRideInput.totalSeats) {
            throw new common_1.BadRequestException('Available seats cannot exceed total seats');
        }
        if (updateRideInput.totalSeats !== undefined &&
            updateRideInput.totalSeats < (ride.totalSeats - ride.availableSeats)) {
            throw new common_1.BadRequestException('Cannot reduce total seats below the number of booked seats');
        }
        if (updateRideInput.totalSeats !== undefined && updateRideInput.availableSeats === undefined) {
            const bookedSeats = ride.totalSeats - ride.availableSeats;
            updateRideInput.availableSeats = updateRideInput.totalSeats - bookedSeats;
        }
        if (updateRideInput.departureTime && new Date(updateRideInput.departureTime) <= new Date()) {
            throw new common_1.BadRequestException('Departure time must be in the future');
        }
        const updatedRide = await this.rideModel.findByIdAndUpdate(id, { $set: updateRideInput }, { new: true }).exec();
        if (hasPriceChanges && ride.bookingIds.length > 0) {
            await this.notifyBookingService('RIDE_PRICE_UPDATED', {
                rideId: ride._id.toString(),
                pricePerSeat: updateRideInput.pricePerSeat || ride.pricePerSeat,
                priceScale: updateRideInput.priceScale || ride.priceScale
            });
        }
        await (0, kafka_1.produceMessage)('ride-events', {
            type: 'RIDE_UPDATED',
            rideId: id,
            driverId: userId,
            updatedFields: Object.keys(updateRideInput),
            bookingIds: ride.bookingIds
        });
        return updatedRide;
    }
    async cancelRide(id, userId) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid ride ID');
        }
        const ride = await this.findById(id);
        if (ride.driverId !== userId) {
            throw new common_1.BadRequestException('You can only cancel your own rides');
        }
        if (ride.status === ride_schema_1.RideStatus.COMPLETED || ride.status === ride_schema_1.RideStatus.CANCELLED) {
            throw new common_1.BadRequestException('Ride is already completed or cancelled');
        }
        const cancelledRide = await this.rideModel.findByIdAndUpdate(id, { $set: { status: ride_schema_1.RideStatus.CANCELLED } }, { new: true }).exec();
        await (0, kafka_1.produceMessage)('ride-events', {
            type: 'RIDE_DELETED',
            rideId: cancelledRide._id.toString(),
            driverId: cancelledRide.driverId
        });
        return cancelledRide;
    }
    async setBookingDeadline(rideId, minutesBeforeDeparture, userId) {
        if (!mongoose_2.Types.ObjectId.isValid(rideId)) {
            throw new common_1.BadRequestException('Invalid ride ID');
        }
        const ride = await this.findById(rideId);
        if (ride.driverId !== userId) {
            throw new common_1.BadRequestException('You can only set deadline for your own rides');
        }
        if (ride.status === ride_schema_1.RideStatus.COMPLETED || ride.status === ride_schema_1.RideStatus.CANCELLED) {
            throw new common_1.BadRequestException('Cannot set deadline for completed or cancelled rides');
        }
        const departureTime = new Date(ride.departureTime);
        const bookingDeadline = new Date(departureTime.getTime() - (minutesBeforeDeparture * 60000));
        const currentTime = new Date();
        if (bookingDeadline <= currentTime) {
            throw new common_1.BadRequestException('Booking deadline must be in the future');
        }
        const updatedRide = await this.rideModel.findByIdAndUpdate(rideId, { $set: { bookingDeadline } }, { new: true }).exec();
        await (0, kafka_1.produceMessage)('ride-events', {
            type: 'BOOKING_DEADLINE_UPDATED',
            rideId: updatedRide._id.toString(),
            driverId: updatedRide.driverId,
            bookingDeadline
        });
        return updatedRide;
    }
    async getRouteForRide(rideId) {
        const ride = await this.findById(rideId);
        return this.routeService.findById(ride.routeId.toString());
    }
    async verifyRideBooking(bookingId, rideId, userId) {
        logger.log(`Verifying ride booking: ${bookingId} for ride: ${rideId}`);
        try {
            const ride = await this.findById(rideId);
            if (ride.bookingDeadline && new Date() > new Date(ride.bookingDeadline)) {
                await (0, kafka_1.produceMessage)('booking-events', {
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
            if (ride.availableSeats <= 0) {
                await (0, kafka_1.produceMessage)('booking-events', {
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
            if (ride.girlsOnly) {
                const isGirlsOnlyEligible = await this.checkUserGender(userId);
                if (!isGirlsOnlyEligible) {
                    await (0, kafka_1.produceMessage)('booking-events', {
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
            await (0, kafka_1.produceMessage)('notification-events', {
                type: 'BOOKING_REQUEST',
                recipientId: ride.driverId,
                title: 'New Booking Request',
                message: `You have a new booking request for your ride from ${ride.startLocation} to ${ride.endLocation}`,
                rideId,
                bookingId,
                timestamp: new Date().toISOString()
            });
            logger.log(`Booking verification completed for ${bookingId}. Awaiting driver approval.`);
        }
        catch (error) {
            logger.error(`Error verifying booking: ${error.message}`);
            await (0, kafka_1.produceMessage)('booking-events', {
                type: 'BOOKING_REJECTED',
                bookingId,
                rideId,
                userId,
                reason: 'Error processing booking request',
                timestamp: new Date().toISOString()
            });
        }
    }
    async handleBookingCancellation(bookingId, rideId, userId) {
        logger.log(`Processing cancellation for booking ${bookingId}`);
        try {
            const ride = await this.findById(rideId);
            if (!ride.bookingIds.includes(bookingId)) {
                logger.warn(`Booking ${bookingId} not found in ride ${rideId}`);
                return;
            }
            const now = new Date();
            const cancellationDeadline = new Date(ride.departureTime);
            cancellationDeadline.setHours(cancellationDeadline.getHours() - 1);
            if (now > cancellationDeadline) {
                logger.warn(`Late cancellation for booking ${bookingId}, after the cancellation deadline`);
                await (0, kafka_1.produceMessage)('booking-events', {
                    type: 'LATE_CANCELLATION',
                    bookingId,
                    rideId,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
            ride.availableSeats = Math.min(ride.totalSeats, ride.availableSeats + 1);
            ride.bookingIds = ride.bookingIds.filter(id => id !== bookingId);
            await this.rideModel.findByIdAndUpdate(rideId, {
                availableSeats: ride.availableSeats,
                bookingIds: ride.bookingIds
            });
            await (0, kafka_1.produceMessage)('notification-events', {
                type: 'BOOKING_CANCELLED',
                recipientId: ride.driverId,
                title: 'Booking Cancelled',
                message: `A passenger has cancelled their booking for your ride from ${ride.startLocation} to ${ride.endLocation}`,
                rideId,
                bookingId,
                timestamp: new Date().toISOString()
            });
            logger.log(`Cancellation processed for booking ${bookingId}`);
        }
        catch (error) {
            logger.error(`Error processing cancellation: ${error.message}`);
        }
    }
    async handleBookingAcceptance(bookingId, rideId, driverId) {
        logger.log(`Processing booking acceptance: ${bookingId}`);
        try {
            const ride = await this.findById(rideId);
            if (ride.driverId !== driverId) {
                logger.warn(`Unauthorized attempt to accept booking ${bookingId} by driver ${driverId}`);
                return;
            }
            if (ride.availableSeats > 0) {
                const updatedAvailableSeats = ride.availableSeats - 1;
                const updatedBookingIds = [...ride.bookingIds, bookingId];
                await this.rideModel.findByIdAndUpdate(rideId, {
                    availableSeats: updatedAvailableSeats,
                    bookingIds: updatedBookingIds
                });
                logger.log(`Booking ${bookingId} accepted and added to ride ${rideId}`);
                await (0, kafka_1.produceMessage)('booking-events', {
                    type: 'BOOKING_CONFIRMED',
                    bookingId,
                    rideId,
                    driverId,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                logger.warn(`Cannot accept booking ${bookingId}: No seats available`);
                await (0, kafka_1.produceMessage)('booking-events', {
                    type: 'BOOKING_ACCEPTANCE_FAILED',
                    bookingId,
                    rideId,
                    driverId,
                    reason: 'No seats available',
                    timestamp: new Date().toISOString()
                });
            }
        }
        catch (error) {
            logger.error(`Error processing booking acceptance: ${error.message}`);
        }
    }
    async handleBookingRejection(bookingId, rideId, driverId) {
        logger.log(`Processing booking rejection for booking ${bookingId}, ride ${rideId}`);
        try {
            const ride = await this.findById(rideId);
            await this.rideModel.findByIdAndUpdate(rideId, {
                $inc: { availableSeats: 1 },
                $pull: { bookingIds: bookingId }
            });
            await (0, kafka_1.produceMessage)('notification-events', {
                type: 'BOOKING_REJECTED',
                rideId,
                bookingId,
                title: 'Booking Rejected',
                message: `Your booking for the ride from ${ride.startLocation} to ${ride.endLocation} has been rejected by the driver`
            });
            logger.log(`Booking rejection processed for ${bookingId}`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Error processing booking rejection: ${errorMessage}`);
        }
    }
    async handleDestinationChange(bookingId, rideId, userId, newDropoffLocation) {
        logger.log(`Handling destination change for booking ${bookingId} on ride ${rideId}`);
        try {
            const ride = await this.findById(rideId);
            if (!ride.bookingIds.includes(bookingId)) {
                throw new common_1.BadRequestException(`Booking ${bookingId} is not associated with ride ${rideId}`);
            }
            const route = await this.routeService.findById(ride.routeId.toString());
            const stops = await this.routeService.getStopsForRoute(ride.routeId.toString());
            const stopNames = stops.map(stop => stop.name);
            if (!stopNames.some(name => name.toLowerCase() === newDropoffLocation.toLowerCase())) {
                throw new common_1.BadRequestException(`The destination ${newDropoffLocation} is not a valid stop in this route`);
            }
            await (0, kafka_1.produceMessage)('ride-events', {
                type: 'DESTINATION_CHANGED',
                rideId,
                bookingId,
                userId,
                driverId: ride.driverId,
                newDropoffLocation,
                timestamp: new Date().toISOString()
            });
            logger.log(`Destination change for booking ${bookingId} on ride ${rideId} processed successfully`);
        }
        catch (error) {
            logger.error(`Failed to process destination change: ${error.message}`);
            throw error;
        }
    }
    async handleUserVerification(userId, isDriver) {
        logger.log(`User ${userId} verified, isDriver: ${isDriver}`);
    }
    async handleDriverApproval(userId) {
        logger.log(`Driver ${userId} approved by admin`);
    }
    async checkUserGender(userId) {
        try {
            const response = await (0, node_fetch_1.default)(`${process.env.USER_SERVICE_URL}/api/users/${userId}/gender`);
            if (!response.ok) {
                throw new Error(`Failed to fetch user gender: ${response.statusText}`);
            }
            const data = await response.json();
            return data.gender === 'female';
        }
        catch (error) {
            logger.error(`Error checking user gender: ${error.message}`);
            return false;
        }
    }
    async findRideHistory(userId) {
        logger.log(`Finding ride history for user ${userId}`);
        try {
            const driverRides = await this.rideModel.find({
                driverId: userId,
                status: { $in: [ride_schema_1.RideStatus.COMPLETED, ride_schema_1.RideStatus.CANCELLED] }
            }).sort({ departureTime: -1 }).exec();
            let passengerRides = [];
            try {
                const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:3002';
                const response = await (0, node_fetch_1.default)(`${bookingServiceUrl}/api/bookings/user/${userId}/history`);
                if (response.ok) {
                    const bookings = await response.json();
                    const rideIds = bookings.map(booking => booking.rideId);
                    if (rideIds.length > 0) {
                        passengerRides = await this.rideModel.find({
                            _id: { $in: rideIds },
                            status: { $in: [ride_schema_1.RideStatus.COMPLETED, ride_schema_1.RideStatus.CANCELLED] }
                        }).exec();
                    }
                }
            }
            catch (error) {
                logger.error(`Failed to fetch passenger bookings: ${error.message}`);
            }
            const allRides = [...driverRides, ...passengerRides];
            return allRides.sort((a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime());
        }
        catch (error) {
            logger.error(`Error finding ride history: ${error.message}`);
            return [];
        }
    }
    async findUserBookings(userId) {
        logger.log(`Finding bookings for user ${userId}`);
        try {
            const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:3002';
            const response = await (0, node_fetch_1.default)(`${bookingServiceUrl}/api/bookings/user/${userId}`);
            if (!response.ok) {
                throw new Error(`Booking service returned status ${response.status}`);
            }
            const bookings = await response.json();
            const rideIds = bookings.map(booking => booking.rideId);
            if (rideIds.length === 0) {
                return [];
            }
            const rides = await this.rideModel.find({
                _id: { $in: rideIds },
                status: { $in: [ride_schema_1.RideStatus.SCHEDULED, ride_schema_1.RideStatus.ACTIVE] }
            }).exec();
            return rides.sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime());
        }
        catch (error) {
            logger.error(`Error finding user bookings: ${error.message}`);
            return [];
        }
    }
    async calculateFareForBooking(rideId, pickupStopId, dropoffStopId) {
        const ride = await this.findById(rideId);
        const route = await this.routeService.findById(ride.routeId.toString());
        const routeStops = await this.routeService.getStopsForRoute(ride.routeId.toString());
        const pickupStop = routeStops.find(rs => rs.stopId.toString() === pickupStopId);
        const dropoffStop = routeStops.find(rs => rs.stopId.toString() === dropoffStopId);
        if (!pickupStop || !dropoffStop) {
            throw new common_1.BadRequestException('Invalid pickup or dropoff stop');
        }
        let distanceCovered = 0;
        let startSeq = Math.min(pickupStop.sequence, dropoffStop.sequence);
        let endSeq = Math.max(pickupStop.sequence, dropoffStop.sequence);
        const isPickupBeforeDropoff = (route.startFromGIU && pickupStop.sequence < dropoffStop.sequence) ||
            (!route.startFromGIU && pickupStop.sequence > dropoffStop.sequence);
        if (!isPickupBeforeDropoff) {
            throw new common_1.BadRequestException('Pickup must be before dropoff in the route direction');
        }
        const baseFare = ride.pricePerSeat;
        let distanceFactor = 1.0;
        if (route.startFromGIU) {
            distanceFactor = 1.0 + ((dropoffStop.sequence - 1) / (routeStops.length - 1)) * (ride.priceScale - 1);
        }
        else {
            distanceFactor = 1.0 + ((routeStops.length - pickupStop.sequence) / (routeStops.length - 1)) * (ride.priceScale - 1);
        }
        const finalFare = baseFare * distanceFactor;
        return Math.round(finalFare * 100) / 100;
    }
    async validateAndOrderStops(routeId, stops) {
        const route = await this.routeService.findById(routeId);
        const isStartFromGIU = route.startFromGIU;
        const stopsWithZones = await Promise.all(stops.map(async (stop) => {
            const stopData = await this.routeService.getStopDetails(stop.stopId);
            const zone = await this.zoneService.findById(stopData.zoneId.toString());
            return {
                ...stop,
                zoneDistanceFromGIU: zone.distanceFromGIU
            };
        }));
        if (isStartFromGIU) {
            stopsWithZones.sort((a, b) => a.zoneDistanceFromGIU - b.zoneDistanceFromGIU);
        }
        else {
            stopsWithZones.sort((a, b) => b.zoneDistanceFromGIU - a.zoneDistanceFromGIU);
        }
        return stopsWithZones.map((stop, index) => ({
            ...stop,
            sequence: index + 1
        }));
    }
    async notifyBookingService(action, data) {
        try {
            const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:3003';
            const endpoint = `${bookingServiceUrl}/api/bookings/notify`;
            await (0, node_fetch_1.default)(endpoint, {
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
        }
        catch (error) {
            logger.error(`Failed to notify booking service: ${error.message}`);
        }
    }
};
exports.RideService = RideService;
exports.RideService = RideService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(ride_schema_1.Ride.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, route_service_1.RouteService,
        zone_service_1.ZoneService])
], RideService);
//# sourceMappingURL=ride.service.js.map