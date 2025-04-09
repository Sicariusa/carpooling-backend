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
exports.RouteService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const route_schema_1 = require("../schemas/route.schema");
const stop_service_1 = require("./stop.service");
const zone_service_1 = require("./zone.service");
let RouteService = class RouteService {
    constructor(routeModel, stopService, zoneService) {
        this.routeModel = routeModel;
        this.stopService = stopService;
        this.zoneService = zoneService;
    }
    async findAll() {
        return this.routeModel.find({ isActive: true }).exec();
    }
    async findById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid route ID');
        }
        const route = await this.routeModel.findById(id).exec();
        if (!route) {
            throw new common_1.NotFoundException(`Route with ID ${id} not found`);
        }
        return route;
    }
    async create(createRouteInput) {
        const { stops, ...routeData } = createRouteInput;
        const routeStops = [];
        for (let i = 0; i < stops.length; i++) {
            const stopInput = stops[i];
            await this.stopService.findById(stopInput.stopId);
            routeStops.push({
                stopId: new mongoose_2.Types.ObjectId(stopInput.stopId),
                sequence: stopInput.sequence || i + 1,
                stop: null,
            });
        }
        if (routeStops.length < 2) {
            throw new common_1.BadRequestException('Route must have at least 2 stops');
        }
        const firstStop = await this.stopService.findById(routeStops[0].stopId.toString());
        const lastStop = await this.stopService.findById(routeStops[routeStops.length - 1].stopId.toString());
        const firstZone = await this.zoneService.findById(firstStop.zoneId.toString());
        const lastZone = await this.zoneService.findById(lastStop.zoneId.toString());
        const hasGIUAtEnds = (firstZone.distanceFromGIU === 0) || (lastZone.distanceFromGIU === 0);
        if (!hasGIUAtEnds) {
            throw new common_1.BadRequestException('Route must have GIU as either the first or last stop');
        }
        const startFromGIU = firstZone.distanceFromGIU === 0;
        const createdRoute = new this.routeModel({
            ...routeData,
            stops: routeStops,
            startFromGIU,
        });
        return createdRoute.save();
    }
    async update(id, updateRouteInput) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid route ID');
        }
        const { stops, ...routeData } = updateRouteInput;
        const updateData = { ...routeData };
        if (stops && stops.length > 0) {
            const routeStops = [];
            for (let i = 0; i < stops.length; i++) {
                const stopInput = stops[i];
                await this.stopService.findById(stopInput.stopId);
                routeStops.push({
                    stopId: new mongoose_2.Types.ObjectId(stopInput.stopId),
                    sequence: stopInput.sequence || i + 1,
                    stop: null,
                });
            }
            if (routeStops.length < 2) {
                throw new common_1.BadRequestException('Route must have at least 2 stops');
            }
            const firstStop = await this.stopService.findById(routeStops[0].stopId.toString());
            const lastStop = await this.stopService.findById(routeStops[routeStops.length - 1].stopId.toString());
            const firstZone = await this.zoneService.findById(firstStop.zoneId.toString());
            const lastZone = await this.zoneService.findById(lastStop.zoneId.toString());
            const hasGIUAtEnds = (firstZone.distanceFromGIU === 0) || (lastZone.distanceFromGIU === 0);
            if (!hasGIUAtEnds) {
                throw new common_1.BadRequestException('Route must have GIU as either the first or last stop');
            }
            updateData.startFromGIU = firstZone.distanceFromGIU === 0;
            updateData.stops = routeStops;
        }
        const updatedRoute = await this.routeModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
        if (!updatedRoute) {
            throw new common_1.NotFoundException(`Route with ID ${id} not found`);
        }
        return updatedRoute;
    }
    async remove(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid route ID');
        }
        const result = await this.routeModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
        if (!result) {
            throw new common_1.NotFoundException(`Route with ID ${id} not found`);
        }
        return true;
    }
    async getStopsForRoute(routeId) {
        if (!mongoose_2.Types.ObjectId.isValid(routeId)) {
            throw new common_1.BadRequestException('Invalid route ID');
        }
        const route = await this.routeModel.findById(routeId).exec();
        if (!route) {
            throw new common_1.NotFoundException(`Route with ID ${routeId} not found`);
        }
        const stopIds = route.stops.map(stop => stop.stopId);
        const stops = await Promise.all(stopIds.map(stopId => this.stopService.findById(stopId.toString())));
        return route.stops.map(routeStop => {
            const stop = stops.find(s => s._id.toString() === routeStop.stopId.toString());
            if (!stop) {
                return {
                    _id: routeStop.stopId,
                    sequence: routeStop.sequence,
                    missing: true
                };
            }
            return {
                _id: stop._id,
                name: stop.name,
                address: stop.address,
                latitude: stop.latitude,
                longitude: stop.longitude,
                zoneId: stop.zoneId,
                zone: stop.zone,
                isActive: stop.isActive,
                createdAt: stop.createdAt,
                updatedAt: stop.updatedAt,
                sequence: routeStop.sequence
            };
        }).sort((a, b) => a.sequence - b.sequence);
    }
    async getStopDetails(stopId) {
        if (!mongoose_2.Types.ObjectId.isValid(stopId)) {
            throw new common_1.BadRequestException('Invalid stop ID');
        }
        const stop = await this.stopService.findById(stopId);
        if (!stop) {
            throw new common_1.NotFoundException(`Stop with ID ${stopId} not found`);
        }
        return stop;
    }
};
exports.RouteService = RouteService;
exports.RouteService = RouteService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(route_schema_1.Route.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, stop_service_1.StopService,
        zone_service_1.ZoneService])
], RouteService);
//# sourceMappingURL=route.service.js.map