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
exports.UsersResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const create_user_input_1 = require("../dto/create-user.input");
const update_user_input_dto_1 = require("../dto/update-user.input.dto");
const user_1 = require("../schema/user");
const users_service_1 = require("../services/users.service");
const auth_guard_1 = require("../guards/auth.guard");
const client_1 = require("@prisma/client");
let UsersResolver = class UsersResolver {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async findAll() {
        return this.usersService.findAll();
    }
    async findOne(universityId) {
        return this.usersService.findOne(universityId);
    }
    async createUser(input) {
        return this.usersService.create(input);
    }
    async update(universityId, input) {
        return this.usersService.update(universityId, input);
    }
    async remove(universityId) {
        return this.usersService.remove(universityId);
    }
};
exports.UsersResolver = UsersResolver;
__decorate([
    (0, graphql_1.Query)(() => [user_1.User], { name: 'getAllUsers' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "findAll", null);
__decorate([
    (0, graphql_1.Query)(() => user_1.User, { name: 'getUserById' }),
    __param(0, (0, graphql_1.Args)('universityId', { type: () => graphql_1.Int })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "findOne", null);
__decorate([
    (0, graphql_1.Mutation)(() => user_1.User, { name: 'registerUser' }),
    (0, auth_guard_1.Public)(),
    __param(0, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_input_1.CreateUserInput]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "createUser", null);
__decorate([
    (0, graphql_1.Mutation)(() => user_1.User, { name: 'updateUser' }),
    __param(0, (0, graphql_1.Args)('universityId', { type: () => graphql_1.Int })),
    __param(1, (0, graphql_1.Args)('input')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_user_input_dto_1.UpdateUserInput]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "update", null);
__decorate([
    (0, graphql_1.Mutation)(() => Boolean, { name: 'deleteUser' }),
    (0, auth_guard_1.Roles)(client_1.Role.ADMIN),
    __param(0, (0, graphql_1.Args)('universityId', { type: () => graphql_1.Int })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], UsersResolver.prototype, "remove", null);
exports.UsersResolver = UsersResolver = __decorate([
    (0, graphql_1.Resolver)(() => user_1.User),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersResolver);
//# sourceMappingURL=users.resolver.js.map