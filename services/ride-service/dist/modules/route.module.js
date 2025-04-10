"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const route_service_1 = require("../services/route.service");
const route_resolver_1 = require("../resolvers/route.resolver");
const route_schema_1 = require("../schemas/route.schema");
const stop_module_1 = require("./stop.module");
const zone_module_1 = require("./zone.module");
let RouteModule = class RouteModule {
};
exports.RouteModule = RouteModule;
exports.RouteModule = RouteModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: route_schema_1.Route.name, schema: route_schema_1.RouteSchema }]),
            stop_module_1.StopModule,
            zone_module_1.ZoneModule,
        ],
        providers: [route_service_1.RouteService, route_resolver_1.RouteResolver],
        exports: [route_service_1.RouteService],
    })
], RouteModule);
//# sourceMappingURL=route.module.js.map