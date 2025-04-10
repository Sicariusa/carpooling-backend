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
exports.RouteResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const route_schema_1 = require("../schemas/route.schema");
const stop_schema_1 = require("../schemas/stop.schema");
const route_service_1 = require("../services/route.service");
const route_dto_1 = require("../dto/route.dto");
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../decorators/roles.decorator");
const auth_guard_1 = require("../guards/auth.guard");
const role_guard_1 = require("../guards/role.guard");
let RouteResolver = class RouteResolver {
    constructor(routeService) {
        this.routeService = routeService;
    }
    async routes() {
        return this.routeService.findAll();
    }
    async route(id) {
        return this.routeService.findById(id);
    }
    async createRoute(input) {
        return this.routeService.create(input);
    }
    async updateRoute(id, input) {
        return this.routeService.update(id, input);
    }
    async removeRoute(id) {
        return this.routeService.remove(id);
    }
    async stops(route) {
        return this.routeService.getStopsForRoute(route._id.toString());
    }
};
exports.RouteResolver = RouteResolver;
__decorate([
    (0, graphql_1.Query)(() => [route_schema_1.Route]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RouteResolver.prototype, "routes", null);
__decorate([
    (0, graphql_1.Query)(() => route_schema_1.Route),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RouteResolver.prototype, "route", null);
__decorate([
    (0, graphql_1.Mutation)(() => route_schema_1.Route),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [route_dto_1.CreateRouteInput]),
    __metadata("design:returntype", Promise)
], RouteResolver.prototype, "createRoute", null);
__decorate([
    (0, graphql_1.Mutation)(() => route_schema_1.Route),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, route_dto_1.UpdateRouteInput]),
    __metadata("design:returntype", Promise)
], RouteResolver.prototype, "updateRoute", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard, role_guard_1.RoleGuard),
    (0, roles_decorator_1.Roles)('ADMIN'),
    __param(0, (0, graphql_1.Args)('id', { type: () => graphql_1.ID })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RouteResolver.prototype, "removeRoute", null);
__decorate([
    (0, graphql_1.ResolveField)(() => [stop_schema_1.Stop]),
    __param(0, (0, graphql_1.Parent)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [route_schema_1.Route]),
    __metadata("design:returntype", Promise)
], RouteResolver.prototype, "stops", null);
exports.RouteResolver = RouteResolver = __decorate([
    (0, graphql_1.Resolver)(() => route_schema_1.Route),
    __metadata("design:paramtypes", [route_service_1.RouteService])
], RouteResolver);
//# sourceMappingURL=route.resolver.js.map