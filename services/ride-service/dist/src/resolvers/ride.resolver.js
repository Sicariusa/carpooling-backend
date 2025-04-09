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
exports.RideResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const ride_schema_1 = require("../schemas/ride.schema");
const route_schema_1 = require("../schemas/route.schema");
const ride_service_1 = require("../services/ride.service");
const ride_dto_1 = require("../dto/ride.dto");
const auth_guard_1 = require("../guards/auth.guard");
const role_guard_1 = require("../guards/role.guard");
const roles_decorator_1 = require("../decorators/roles.decorator");
let RideResolver = class RideResolver {
    constructor(rideService) {
        this.rideService = rideService;
    }
    async rides() {
        return this.rideService.findAll();
    }
    async ride(id) {
        return this.rideService.findById(id);
    }
    async searchRides(searchInput) {
        return this.rideService.searchRides(searchInput);
    }
    async calculateFare(rideId, pickupStopId, dropoffStopId) {
        return this.rideService.calculateFareForBooking(rideId, pickupStopId, dropoffStopId);
    }
    async myRides(context) {
        const { user } = context.req;
        return this.rideService.findByDriver(user.id);
    }
    async myRideHistory(context) {
        const { user } = context.req;
        return this.rideService.findRideHistory(user.id);
    }
    async myBookings(context) {
        const { user } = context.req;
        return this.rideService.findUserBookings(user.id);
    }
    async createRide(createRideInput, context) {
        const { user } = context.req;
        return this.rideService.create(createRideInput, user.id);
    }
    async updateRide(id, updateRideInput, context) {
        const { user } = context.req;
        return this.rideService.update(id, updateRideInput, user.id);
    }
    async setRideGirlsOnly(id, girlsOnly, context) {
        const { user } = context.req;
        const updateInput = { girlsOnly };
        return this.rideService.update(id, updateInput, user.id);
    }
    async cancelRide(id, context) {
        const { user } = context.req;
        return this.rideService.cancelRide(id, user.id);
    }
    async setBookingDeadline(input, context) {
        const { user } = context.req;
        return this.rideService.setBookingDeadline(input.rideId, input.minutesBeforeDeparture, user.id);
    }
    async route(ride) {
        return this.rideService.getRouteForRide(ride._id.toString());
    }
};
exports.RideResolver = RideResolver;
__decorate([
    (0, graphql_1.Query)(() => [ride_schema_1.Ride]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "rides", null);
__decorate([
    (0, graphql_1.Query)(() => ride_schema_1.Ride),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "ride", null);
__decorate([
    (0, graphql_1.Query)(() => [ride_schema_1.Ride]),
    __param(0, (0, graphql_1.Args)('searchInput')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ride_dto_1.SearchRideInput]),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "searchRides", null);
__decorate([
    (0, graphql_1.Query)(() => Number),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, graphql_1.Args)('rideId', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('pickupStopId', { type: () => graphql_1.ID })),
    __param(2, (0, graphql_1.Args)('dropoffStopId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "calculateFare", null);
__decorate([
    (0, graphql_1.Query)(() => [ride_schema_1.Ride]),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('DRIVER'),
    __param(0, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "myRides", null);
__decorate([
    (0, graphql_1.Query)(() => [ride_schema_1.Ride]),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "myRideHistory", null);
__decorate([
    (0, graphql_1.Query)(() => [ride_schema_1.Ride]),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    __param(0, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "myBookings", null);
__decorate([
    (0, graphql_1.Mutation)(() => ride_schema_1.Ride),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('DRIVER'),
    __param(0, (0, graphql_1.Args)('createRideInput')),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ride_dto_1.CreateRideInput, Object]),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "createRide", null);
__decorate([
    (0, graphql_1.Mutation)(() => ride_schema_1.Ride),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('DRIVER'),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('updateRideInput')),
    __param(2, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ride_dto_1.UpdateRideInput, Object]),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "updateRide", null);
__decorate([
    (0, graphql_1.Mutation)(() => ride_schema_1.Ride),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('DRIVER'),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('girlsOnly', { type: () => Boolean })),
    __param(2, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, Object]),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "setRideGirlsOnly", null);
__decorate([
    (0, graphql_1.Mutation)(() => ride_schema_1.Ride),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('DRIVER'),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "cancelRide", null);
__decorate([
    (0, graphql_1.Mutation)(() => ride_schema_1.Ride),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('DRIVER'),
    __param(0, (0, graphql_1.Args)('input')),
    __param(1, (0, graphql_1.Context)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ride_dto_1.BookingDeadlineInput, Object]),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "setBookingDeadline", null);
__decorate([
    (0, graphql_1.ResolveField)(() => route_schema_1.Route),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ride_schema_1.Ride]),
    __metadata("design:returntype", Promise)
], RideResolver.prototype, "route", null);
exports.RideResolver = RideResolver = __decorate([
    (0, graphql_1.Resolver)(() => ride_schema_1.Ride),
    __metadata("design:paramtypes", [ride_service_1.RideService])
], RideResolver);
//# sourceMappingURL=ride.resolver.js.map