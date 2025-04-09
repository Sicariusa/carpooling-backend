"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const ride_service_1 = require("../services/ride.service");
const ride_resolver_1 = require("../resolvers/ride.resolver");
const ride_schema_1 = require("../schemas/ride.schema");
const route_module_1 = require("./route.module");
const zone_module_1 = require("./zone.module");
let RideModule = class RideModule {
};
exports.RideModule = RideModule;
exports.RideModule = RideModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: ride_schema_1.Ride.name, schema: ride_schema_1.RideSchema }]),
            route_module_1.RouteModule,
            zone_module_1.ZoneModule,
        ],
        providers: [ride_service_1.RideService, ride_resolver_1.RideResolver],
        exports: [ride_service_1.RideService],
    })
], RideModule);
//# sourceMappingURL=ride.module.js.map