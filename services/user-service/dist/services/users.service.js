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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
const bcrypt = require("bcrypt");
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(input) {
        const hashedPassword = await bcrypt.hash(input.password, 10);
        return this.prisma.user.create({
            data: {
                ...input,
                password: hashedPassword
            }
        });
    }
    async findAll() {
        return this.prisma.user.findMany();
    }
    async findOne(universityId) {
        const user = await this.prisma.user.findUnique({ where: { universityId } });
        if (!user) {
            throw new common_1.NotFoundException(`User with university ID ${universityId} not found`);
        }
        return user;
    }
    async update(universityId, input) {
        return this.prisma.user.update({ where: { universityId }, data: input });
    }
    async remove(universityId) {
        try {
            await this.prisma.user.delete({ where: { universityId } });
            return true;
        }
        catch (error) {
            throw new common_1.NotFoundException(`User with university ID ${universityId} not found`);
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map