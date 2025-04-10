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
exports.ZoneResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const common_1 = require("@nestjs/common");
const zone_schema_1 = require("../schemas/zone.schema");
const zone_service_1 = require("../services/zone.service");
const zone_dto_1 = require("../dto/zone.dto");
const auth_guard_1 = require("../guards/auth.guard");
const role_guard_1 = require("../guards/role.guard");
const roles_decorator_1 = require("../decorators/roles.decorator");
let ZoneResolver = class ZoneResolver {
    constructor(zoneService) {
        this.zoneService = zoneService;
    }
    async zones() {
        return this.zoneService.findAll();
    }
    async zone(id) {
        return this.zoneService.findById(id);
    }
    async createZone(input) {
        return this.zoneService.create(input);
    }
    async updateZone(id, input) {
        return this.zoneService.update(id, input);
    }
    async removeZone(id) {
        return this.zoneService.remove(id);
    }
};
exports.ZoneResolver = ZoneResolver;
__decorate([
    (0, graphql_1.Query)(() => [zone_schema_1.Zone]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ZoneResolver.prototype, "zones", null);
__decorate([
    (0, graphql_1.Query)(() => zone_schema_1.Zone),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ZoneResolver.prototype, "zone", null);
__decorate([
    (0, graphql_1.Mutation)(() => zone_schema_1.Zone),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [zone_dto_1.CreateZoneInput]),
    __metadata("design:returntype", Promise)
], ZoneResolver.prototype, "createZone", null);
__decorate([
    (0, graphql_1.Mutation)(() => zone_schema_1.Zone),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, zone_dto_1.UpdateZoneInput]),
    __metadata("design:returntype", Promise)
], ZoneResolver.prototype, "updateZone", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ZoneResolver.prototype, "removeZone", null);
exports.ZoneResolver = ZoneResolver = __decorate([
    (0, graphql_1.Resolver)(() => zone_schema_1.Zone),
    __metadata("design:paramtypes", [zone_service_1.ZoneService])
], ZoneResolver);
//# sourceMappingURL=zone.resolver.js.map