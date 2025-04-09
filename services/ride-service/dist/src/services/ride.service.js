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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const ride_schema_1 = require("../schemas/ride.schema");
const stop_service_1 = require("./stop.service");
const zone_service_1 = require("./zone.service");
const kafka_1 = require("../utils/kafka");
const node_fetch_1 = require("node-fetch");
const logger = new common_1.Logger('RideService');
let RideService = class RideService {
    constructor(rideModel, stopService, zoneService) {
        this.rideModel = rideModel;
        this.stopService = stopService;
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
                const stopIds = ride.stops.map(stop => stop.stopId);
                const stops = await Promise.all(stopIds.map(stopId => this.stopService.findById(stopId.toString())));
                const orderedStops = [...ride.stops]
                    .sort((a, b) => a.sequence - b.sequence)
                    .map(orderedStop => {
                    return stops.find(s => s._id.toString() === orderedStop.stopId.toString());
                });
                const zoneIds = await Promise.all(orderedStops.map(async (stop) => {
                    if (!stop)
                        return null;
                    return stop.zoneId.toString();
                }));
                const validZoneIds = zoneIds.filter(id => id !== null);
                const isStartFromGIU = ride.startFromGIU;
                if (isStartFromGIU) {
                    if (fromZoneId) {
                        const fromZone = await this.zoneService.findById(fromZoneId);
                        if (fromZone.distanceFromGIU !== 0) {
                            return null;
                        }
                    }
                    if (toZoneId && !validZoneIds.includes(toZoneId)) {
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
                    if (fromZoneId && !validZoneIds.includes(fromZoneId)) {
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
        const stopIds = createRideInput.stops.map(stop => stop.stopId);
        const stops = await Promise.all(stopIds.map(async (stopId) => {
            if (!mongoose_2.Types.ObjectId.isValid(stopId)) {
                throw new common_1.BadRequestException(`Invalid stop ID: ${stopId}`);
            }
            return this.stopService.findById(stopId);
        }));
        const zoneIds = await Promise.all(stops.map(async (stop) => {
            return stop.zoneId.toString();
        }));
        const zones = await Promise.all(zoneIds.map(zoneId => this.zoneService.findById(zoneId)));
        const orderedStops = [...createRideInput.stops]
            .sort((a, b) => a.sequence - b.sequence);
        const orderedZones = orderedStops.map((stopInput, index) => {
            const stopIndex = stopIds.indexOf(stopInput.stopId);
            return zones[stopIndex];
        });
        const firstZone = orderedZones[0];
        const lastZone = orderedZones[orderedZones.length - 1];
        const hasGIUAtEnds = (firstZone.distanceFromGIU === 0) || (lastZone.distanceFromGIU === 0);
        if (!hasGIUAtEnds) {
            throw new common_1.BadRequestException('Ride must have GIU as either the first or last stop');
        }
        const startFromGIU = firstZone.distanceFromGIU === 0;
        if (startFromGIU) {
            for (let i = 1; i < orderedZones.length; i++) {
                if (orderedZones[i].distanceFromGIU < orderedZones[i - 1].distanceFromGIU) {
                    throw new common_1.BadRequestException('When starting from GIU, stops must be in order of increasing distance from GIU');
                }
            }
        }
        else {
            for (let i = 1; i < orderedZones.length; i++) {
                if (orderedZones[i].distanceFromGIU > orderedZones[i - 1].distanceFromGIU) {
                    throw new common_1.BadRequestException('When ending at GIU, stops must be in order of decreasing distance from GIU');
                }
            }
        }
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
        const formattedStops = createRideInput.stops.map(stop => ({
            stopId: new mongoose_2.Types.ObjectId(stop.stopId),
            sequence: stop.sequence
        }));
        const createdRide = new this.rideModel({
            ...createRideInput,
            stops: formattedStops,
            startFromGIU,
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
    async update(id, updateRideInput, userId) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid ride ID');
        }
        const ride = await this.findById(id);
        if (ride.driverId !== userId) {
            throw new common_1.BadRequestException('Only the ride driver can update the ride');
        }
        if (updateRideInput.stops && updateRideInput.stops.length > 0) {
            const stopIds = updateRideInput.stops.map(stop => stop.stopId);
            const stops = await Promise.all(stopIds.map(async (stopId) => {
                if (!mongoose_2.Types.ObjectId.isValid(stopId)) {
                    throw new common_1.BadRequestException(`Invalid stop ID: ${stopId}`);
                }
                return this.stopService.findById(stopId);
            }));
            const zoneIds = await Promise.all(stops.map(async (stop) => {
                return stop.zoneId.toString();
            }));
            const zones = await Promise.all(zoneIds.map(zoneId => this.zoneService.findById(zoneId)));
            const orderedStops = [...updateRideInput.stops]
                .sort((a, b) => a.sequence - b.sequence);
            const orderedZones = orderedStops.map((stopInput, index) => {
                const stopIndex = stopIds.indexOf(stopInput.stopId);
                return zones[stopIndex];
            });
            const firstZone = orderedZones[0];
            const lastZone = orderedZones[orderedZones.length - 1];
            const hasGIUAtEnds = (firstZone.distanceFromGIU === 0) || (lastZone.distanceFromGIU === 0);
            if (!hasGIUAtEnds) {
                throw new common_1.BadRequestException('Ride must have GIU as either the first or last stop');
            }
            const startFromGIU = firstZone.distanceFromGIU === 0;
            if (startFromGIU) {
                for (let i = 1; i < orderedZones.length; i++) {
                    if (orderedZones[i].distanceFromGIU < orderedZones[i - 1].distanceFromGIU) {
                        throw new common_1.BadRequestException('When starting from GIU, stops must be in order of increasing distance from GIU');
                    }
                }
            }
            else {
                for (let i = 1; i < orderedZones.length; i++) {
                    if (orderedZones[i].distanceFromGIU > orderedZones[i - 1].distanceFromGIU) {
                        throw new common_1.BadRequestException('When ending at GIU, stops must be in order of decreasing distance from GIU');
                    }
                }
            }
            const formattedStops = updateRideInput.stops.map(stop => ({
                stopId: new mongoose_2.Types.ObjectId(stop.stopId),
                sequence: stop.sequence
            }));
            const { stops: rideStops, ...restInput } = updateRideInput;
            const updatedInput = {
                ...restInput,
                stops: formattedStops,
                startFromGIU
            };
            const updatedRide = await this.rideModel.findByIdAndUpdate(id, { $set: updatedInput }, { new: true }).exec();
            if (!updatedRide) {
                throw new common_1.NotFoundException(`Ride with ID ${id} not found`);
            }
            await (0, kafka_1.produceMessage)('ride-events', {
                type: 'RIDE_UPDATED',
                rideId: updatedRide._id.toString(),
                driverId: updatedRide.driverId,
                changes: Object.keys(updatedInput)
            });
            return updatedRide;
        }
        if (updateRideInput.totalSeats !== undefined && updateRideInput.totalSeats < 1) {
            throw new common_1.BadRequestException('Total seats must be at least 1');
        }
        if (updateRideInput.availableSeats !== undefined &&
            updateRideInput.totalSeats !== undefined &&
            updateRideInput.availableSeats > updateRideInput.totalSeats) {
            throw new common_1.BadRequestException('Available seats cannot exceed total seats');
        }
        if (updateRideInput.departureTime) {
            const currentDate = new Date();
            if (new Date(updateRideInput.departureTime) <= currentDate) {
                throw new common_1.BadRequestException('Departure time must be in the future');
            }
        }
        const updatedRide = await this.rideModel.findByIdAndUpdate(id, { $set: updateRideInput }, { new: true }).exec();
        if (!updatedRide) {
            throw new common_1.NotFoundException(`Ride with ID ${id} not found`);
        }
        await (0, kafka_1.produceMessage)('ride-events', {
            type: 'RIDE_UPDATED',
            rideId: updatedRide._id.toString(),
            driverId: updatedRide.driverId,
            changes: Object.keys(updateRideInput)
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
            const stopIds = ride.stops.map(stop => stop.stopId);
            const stops = await Promise.all(stopIds.map(stopId => this.stopService.findById(stopId.toString())));
            const stopNames = stops.map(stop => stop.name.toLowerCase());
            if (!stopNames.includes(newDropoffLocation.toLowerCase())) {
                throw new common_1.BadRequestException(`The destination ${newDropoffLocation} is not a valid stop in this route`);
            }
            await (0, kafka_1.produceMessage)('notification-events', {
                type: 'DESTINATION_CHANGED',
                recipientId: ride.driverId,
                title: 'Dropoff Location Changed',
                message: `A passenger has changed their drop-off location to ${newDropoffLocation}`,
                rideId,
                bookingId,
                userId,
                timestamp: new Date().toISOString()
            });
            await (0, kafka_1.produceMessage)('booking-events', {
                type: 'DESTINATION_CHANGE_APPROVED',
                bookingId,
                rideId,
                userId,
                newDropoffLocation,
                timestamp: new Date().toISOString()
            });
            logger.log(`Destination change for booking ${bookingId} on ride ${rideId} processed successfully`);
        }
        catch (error) {
            logger.error(`Failed to process destination change: ${error.message}`);
            await (0, kafka_1.produceMessage)('booking-events', {
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
        try {
            const ride = await this.findById(rideId);
            const rideStops = ride.stops.sort((a, b) => a.sequence - b.sequence);
            const pickupStop = rideStops.find(stop => stop.stopId.toString() === pickupStopId);
            const dropoffStop = rideStops.find(stop => stop.stopId.toString() === dropoffStopId);
            if (!pickupStop || !dropoffStop) {
                throw new common_1.BadRequestException('Invalid pickup or dropoff stop for this ride');
            }
            const pickupStopDetails = await this.stopService.findById(pickupStopId);
            const dropoffStopDetails = await this.stopService.findById(dropoffStopId);
            if (!pickupStopDetails || !dropoffStopDetails) {
                throw new common_1.BadRequestException('Stop details not found');
            }
            const pickupZone = await this.zoneService.findById(pickupStopDetails.zoneId.toString());
            const dropoffZone = await this.zoneService.findById(dropoffStopDetails.zoneId.toString());
            const isStartFromGIU = ride.startFromGIU;
            const isPickupBeforeDropoff = (isStartFromGIU && pickupStop.sequence < dropoffStop.sequence) ||
                (!isStartFromGIU && pickupStop.sequence > dropoffStop.sequence);
            if (!isPickupBeforeDropoff) {
                throw new common_1.BadRequestException('Pickup must be before dropoff in the route direction');
            }
            const baseFare = ride.pricePerSeat;
            let distanceFactor = 1.0;
            if (isStartFromGIU) {
                distanceFactor = 1.0 + (dropoffZone.distanceFromGIU / 10) * (ride.priceScale - 1);
            }
            else {
                distanceFactor = 1.0 + (pickupZone.distanceFromGIU / 10) * (ride.priceScale - 1);
            }
            const finalFare = baseFare * distanceFactor;
            return Math.round(finalFare * 100) / 100;
        }
        catch (error) {
            if (error instanceof Error) {
                logger.error(`Error calculating fare: ${error.message}`);
            }
            else {
                logger.error('Unknown error calculating fare');
            }
            throw error;
        }
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
            if (error instanceof Error) {
                logger.error(`Failed to notify booking service: ${error.message}`);
            }
            else {
                logger.error('Unknown error notifying booking service');
            }
        }
    }
    async setGirlsOnly(id, girlsOnly, userId) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid ride ID');
        }
        const ride = await this.findById(id);
        if (ride.driverId !== userId) {
            throw new common_1.BadRequestException('Only the ride driver can update the ride');
        }
        const updatedRide = await this.rideModel.findByIdAndUpdate(id, { $set: { girlsOnly } }, { new: true }).exec();
        if (!updatedRide) {
            throw new common_1.NotFoundException(`Ride with ID ${id} not found`);
        }
        await (0, kafka_1.produceMessage)('ride-events', {
            type: 'RIDE_GIRLS_ONLY_UPDATED',
            rideId: updatedRide._id.toString(),
            driverId: updatedRide.driverId,
            girlsOnly: updatedRide.girlsOnly,
            bookingIds: updatedRide.bookingIds
        });
        return updatedRide;
    }
    async acceptBookingRequest(bookingId, rideId, userId) {
        if (!mongoose_2.Types.ObjectId.isValid(rideId)) {
            throw new common_1.BadRequestException('Invalid ride ID');
        }
        const ride = await this.findById(rideId);
        if (ride.driverId !== userId) {
            throw new common_1.BadRequestException('Only the ride driver can accept booking requests');
        }
        if (ride.availableSeats <= 0) {
            throw new common_1.BadRequestException('No available seats remaining for this ride');
        }
        const updatedRide = await this.rideModel.findByIdAndUpdate(rideId, {
            $inc: { availableSeats: -1 },
            $push: { bookingIds: bookingId }
        }, { new: true }).exec();
        if (!updatedRide) {
            throw new common_1.NotFoundException(`Ride with ID ${rideId} not found`);
        }
        await (0, kafka_1.produceMessage)('booking-events', {
            type: 'BOOKING_ACCEPTED',
            bookingId,
            rideId,
            driverId: userId,
            remainingSeats: updatedRide.availableSeats,
            timestamp: new Date().toISOString()
        });
        return updatedRide;
    }
    async rejectBookingRequest(bookingId, rideId, userId) {
        if (!mongoose_2.Types.ObjectId.isValid(rideId)) {
            throw new common_1.BadRequestException('Invalid ride ID');
        }
        const ride = await this.findById(rideId);
        if (ride.driverId !== userId) {
            throw new common_1.BadRequestException('Only the ride driver can reject booking requests');
        }
        if (ride.bookingIds.includes(bookingId)) {
            await this.rideModel.findByIdAndUpdate(rideId, {
                $pull: { bookingIds: bookingId },
                $inc: { availableSeats: 1 }
            });
        }
        await (0, kafka_1.produceMessage)('booking-events', {
            type: 'BOOKING_REJECTED',
            bookingId,
            rideId,
            driverId: userId,
            reason: 'Rejected by driver',
            timestamp: new Date().toISOString()
        });
        return this.findById(rideId);
    }
    async modifyDropoffLocation(bookingId, rideId, userId, newDropoffLocation) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(rideId)) {
                throw new common_1.BadRequestException('Invalid ride ID');
            }
            const ride = await this.findById(rideId);
            const stopIds = ride.stops.map(stop => stop.stopId);
            const stops = await Promise.all(stopIds.map(stopId => this.stopService.findById(stopId.toString())));
            const validStopNames = stops.map(stop => stop.name.toLowerCase());
            if (!validStopNames.includes(newDropoffLocation.toLowerCase())) {
                throw new common_1.BadRequestException(`The destination ${newDropoffLocation} is not a valid stop in this route`);
            }
            await (0, kafka_1.produceMessage)('booking-events', {
                type: 'BOOKING_DESTINATION_MODIFIED',
                bookingId,
                rideId,
                userId,
                newDropoffLocation,
                timestamp: new Date().toISOString()
            });
            return true;
        }
        catch (error) {
            if (error instanceof Error) {
                logger.error(`Error modifying dropoff location: ${error.message}`);
            }
            else {
                logger.error('Unknown error modifying dropoff location');
            }
            return false;
        }
    }
    async handlePaymentCompleted(bookingId, rideId, userId) {
        logger.log(`Payment completed for booking ${bookingId}, ride ${rideId}`);
        try {
            const ride = await this.findById(rideId);
            await (0, kafka_1.produceMessage)('notification-events', {
                type: 'PAYMENT_COMPLETED',
                recipientId: ride.driverId,
                title: 'Payment Received',
                message: `Payment for booking ${bookingId} has been completed successfully`,
                rideId,
                bookingId,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            if (error instanceof Error) {
                logger.error(`Error handling payment completion: ${error.message}`);
            }
            else {
                logger.error('Unknown error handling payment completion');
            }
        }
    }
    async handlePaymentFailed(bookingId, rideId, userId) {
        logger.log(`Payment failed for booking ${bookingId}, ride ${rideId}`);
        try {
            const ride = await this.findById(rideId);
            await (0, kafka_1.produceMessage)('notification-events', {
                type: 'PAYMENT_FAILED',
                recipientId: ride.driverId,
                title: 'Payment Failed',
                message: `Payment for booking ${bookingId} has failed. The passenger may try again.`,
                rideId,
                bookingId,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
            if (error instanceof Error) {
                logger.error(`Error handling payment failure: ${error.message}`);
            }
            else {
                logger.error('Unknown error handling payment failure');
            }
        }
    }
};
exports.RideService = RideService;
exports.RideService = RideService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(ride_schema_1.Ride.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        stop_service_1.StopService,
        zone_service_1.ZoneService])
], RideService);
//# sourceMappingURL=ride.service.js.map