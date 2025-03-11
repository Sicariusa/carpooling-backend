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
exports.LoginResponse = exports.AuthResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const auth_service_1 = require("../services/auth.service");
const user_1 = require("../schema/user");
const auth_guard_1 = require("../guards/auth.guard");
let AuthResolver = class AuthResolver {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async login(universityId, password) {
        return this.authService.login(universityId, password);
    }
};
exports.AuthResolver = AuthResolver;
__decorate([
    (0, graphql_1.Mutation)(() => LoginResponse),
    (0, auth_guard_1.Public)(),
    __param(0, (0, graphql_1.Args)('universityId', { type: () => graphql_1.Int })),
    __param(1, (0, graphql_1.Args)('password')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], AuthResolver.prototype, "login", null);
exports.AuthResolver = AuthResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthResolver);
const graphql_2 = require("@nestjs/graphql");
let LoginResponse = class LoginResponse {
    accessToken;
    user;
};
exports.LoginResponse = LoginResponse;
__decorate([
    (0, graphql_2.Field)(),
    __metadata("design:type", String)
], LoginResponse.prototype, "accessToken", void 0);
__decorate([
    (0, graphql_2.Field)(() => user_1.User),
    __metadata("design:type", user_1.User)
], LoginResponse.prototype, "user", void 0);
exports.LoginResponse = LoginResponse = __decorate([
    (0, graphql_2.ObjectType)()
], LoginResponse);
//# sourceMappingURL=auth.resolver.js.map