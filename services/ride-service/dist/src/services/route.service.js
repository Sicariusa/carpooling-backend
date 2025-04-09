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
const stop_service_1 = require("./stop.service");
let RouteService = class RouteService {
    constructor(routeModel, stopService) {
        this.routeModel = routeModel;
        this.stopService = stopService;
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
    async getStopsForRoute(routeId) {
        const route = await this.findById(routeId);
        if (!route.stops || route.stops.length === 0) {
            return [];
        }
        const stops = await Promise.all(route.stops.map(async (routeStop) => {
            const stop = await this.stopService.findById(routeStop.stopId.toString());
            return {
                ...stop.toObject(),
                sequence: routeStop.sequence
            };
        }));
        return stops.sort((a, b) => a.sequence - b.sequence);
    }
    async getStopDetails(stopId) {
        return this.stopService.findById(stopId);
    }
};
exports.RouteService = RouteService;
exports.RouteService = RouteService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Route')),
    __metadata("design:paramtypes", [mongoose_2.Model, typeof (_a = typeof stop_service_1.StopService !== "undefined" && stop_service_1.StopService) === "function" ? _a : Object])
], RouteService);
//# sourceMappingURL=route.service.js.map