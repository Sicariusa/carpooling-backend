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
exports.ZoneService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const zone_schema_1 = require("../schemas/zone.schema");
let ZoneService = class ZoneService {
    constructor(zoneModel) {
        this.zoneModel = zoneModel;
    }
    async findAll() {
        return this.zoneModel.find({ isActive: true }).exec();
    }
    async findById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid zone ID');
        }
        const zone = await this.zoneModel.findById(id).exec();
        if (!zone) {
            throw new common_1.NotFoundException(`Zone with ID ${id} not found`);
        }
        return zone;
    }
    async create(createZoneInput) {
        const createdZone = new this.zoneModel(createZoneInput);
        return createdZone.save();
    }
    async update(id, updateZoneInput) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid zone ID');
        }
        const updatedZone = await this.zoneModel.findByIdAndUpdate(id, { $set: updateZoneInput }, { new: true }).exec();
        if (!updatedZone) {
            throw new common_1.NotFoundException(`Zone with ID ${id} not found`);
        }
        return updatedZone;
    }
    async remove(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid zone ID');
        }
        const result = await this.zoneModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
        if (!result) {
            throw new common_1.NotFoundException(`Zone with ID ${id} not found`);
        }
        return true;
    }
    async validateZoneDirection(fromZoneId, toZoneId) {
        const fromZone = await this.findById(fromZoneId);
        const toZone = await this.findById(toZoneId);
        const isMovingAwayFromGIU = toZone.distanceFromGIU > fromZone.distanceFromGIU;
        const isMovingTowardsGIU = toZone.distanceFromGIU < fromZone.distanceFromGIU;
        return isMovingAwayFromGIU || isMovingTowardsGIU;
    }
};
exports.ZoneService = ZoneService;
exports.ZoneService = ZoneService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(zone_schema_1.Zone.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ZoneService);
//# sourceMappingURL=zone.service.js.map