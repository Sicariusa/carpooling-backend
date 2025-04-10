"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StopModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const stop_service_1 = require("../services/stop.service");
const stop_resolver_1 = require("../resolvers/stop.resolver");
const stop_schema_1 = require("../schemas/stop.schema");
const zone_module_1 = require("./zone.module");
let StopModule = class StopModule {
};
exports.StopModule = StopModule;
exports.StopModule = StopModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: stop_schema_1.Stop.name, schema: stop_schema_1.StopSchema }]),
            zone_module_1.ZoneModule,
        ],
        providers: [stop_service_1.StopService, stop_resolver_1.StopResolver],
        exports: [stop_service_1.StopService],
    })
], StopModule);
//# sourceMappingURL=stop.module.js.map