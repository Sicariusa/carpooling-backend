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
exports.StopResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const stop_schema_1 = require("../schemas/stop.schema");
const stop_service_1 = require("../services/stop.service");
const stop_dto_1 = require("../dto/stop.dto");
const auth_guard_1 = require("../guards/auth.guard");
const role_guard_1 = require("../guards/role.guard");
const roles_decorator_1 = require("../decorators/roles.decorator");
const zone_schema_1 = require("../schemas/zone.schema");
let StopResolver = class StopResolver {
    constructor(stopService) {
        this.stopService = stopService;
    }
    async stops() {
        return this.stopService.findAll();
    }
    async stop(id) {
        return this.stopService.findById(id);
    }
    async stopsByZone(zoneId) {
        return this.stopService.findByZone(zoneId);
    }
    async createStop(input) {
        return this.stopService.create(input);
    }
    async updateStop(id, input) {
        return this.stopService.update(id, input);
    }
    async removeStop(id) {
        return this.stopService.remove(id);
    }
    async zone(stop) {
        return this.stopService.getZoneForStop(stop._id.toString());
    }
};
exports.StopResolver = StopResolver;
__decorate([
    (0, graphql_1.Query)(() => [stop_schema_1.Stop]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StopResolver.prototype, "stops", null);
__decorate([
    (0, graphql_1.Query)(() => stop_schema_1.Stop),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StopResolver.prototype, "stop", null);
__decorate([
    (0, graphql_1.Query)(() => [stop_schema_1.Stop]),
    __param(0, (0, graphql_1.Args)('zoneId', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StopResolver.prototype, "stopsByZone", null);
__decorate([
    (0, graphql_1.Mutation)(() => stop_schema_1.Stop),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [stop_dto_1.CreateStopInput]),
    __metadata("design:returntype", Promise)
], StopResolver.prototype, "createStop", null);
__decorate([
    (0, graphql_1.Mutation)(() => stop_schema_1.Stop),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, stop_dto_1.UpdateStopInput]),
    __metadata("design:returntype", Promise)
], StopResolver.prototype, "updateStop", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StopResolver.prototype, "removeStop", null);
__decorate([
    (0, graphql_1.ResolveField)(() => zone_schema_1.Zone),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [stop_schema_1.Stop]),
    __metadata("design:returntype", Promise)
], StopResolver.prototype, "zone", null);
exports.StopResolver = StopResolver = __decorate([
    (0, graphql_1.Resolver)(() => stop_schema_1.Stop),
    __metadata("design:paramtypes", [stop_service_1.StopService])
], StopResolver);
//# sourceMappingURL=stop.resolver.js.map