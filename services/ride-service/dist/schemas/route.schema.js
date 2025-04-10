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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteSchema = exports.Route = exports.RouteStop = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const graphql_1 = require("@nestjs/graphql");
const stop_schema_1 = require("./stop.schema");
let RouteStop = class RouteStop {
};
exports.RouteStop = RouteStop;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Stop', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], RouteStop.prototype, "stopId", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Int),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], RouteStop.prototype, "sequence", void 0);
__decorate([
    (0, graphql_1.Field)(() => stop_schema_1.Stop),
    __metadata("design:type", stop_schema_1.Stop)
], RouteStop.prototype, "stop", void 0);
exports.RouteStop = RouteStop = __decorate([
    (0, graphql_1.ObjectType)()
], RouteStop);
const RouteStopSchema = mongoose_1.SchemaFactory.createForClass(RouteStop);
let Route = class Route {
};
exports.Route = Route;
__decorate([
    (0, graphql_1.Field)(() => graphql_1.ID),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Route.prototype, "_id", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Route.prototype, "name", void 0);
__decorate([
    (0, graphql_1.Field)(),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Route.prototype, "description", void 0);
__decorate([
    (0, graphql_1.Field)(() => graphql_1.Float),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Route.prototype, "totalDistance", void 0);
__decorate([
    (0, graphql_1.Field)(() => [RouteStop]),
    (0, mongoose_1.Prop)({ type: [RouteStopSchema], required: true }),
    __metadata("design:type", Array)
], Route.prototype, "stops", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean),
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Boolean)
], Route.prototype, "startFromGIU", void 0);
__decorate([
    (0, graphql_1.Field)(() => Boolean),
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Route.prototype, "isActive", void 0);
__decorate([
    (0, graphql_1.Field)(() => Date),
    __metadata("design:type", Date)
], Route.prototype, "createdAt", void 0);
__decorate([
    (0, graphql_1.Field)(() => Date),
    __metadata("design:type", Date)
], Route.prototype, "updatedAt", void 0);
exports.Route = Route = __decorate([
    (0, graphql_1.ObjectType)(),
    (0, mongoose_1.Schema)({ timestamps: true })
], Route);
exports.RouteSchema = mongoose_1.SchemaFactory.createForClass(Route);
//# sourceMappingURL=route.schema.js.map