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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StopService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const stop_schema_1 = require("../schemas/stop.schema");
const zone_service_1 = require("./zone.service");
let StopService = class StopService {
    constructor(stopModel, zoneService) {
        this.stopModel = stopModel;
        this.zoneService = zoneService;
    }
    async findAll() {
        return this.stopModel.find({ isActive: true }).exec();
    }
    async findById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid stop ID');
        }
        const stop = await this.stopModel.findById(id).exec();
        if (!stop) {
            throw new common_1.NotFoundException(`Stop with ID ${id} not found`);
        }
        return stop;
    }
    async findByZone(zoneId) {
        if (!mongoose_2.Types.ObjectId.isValid(zoneId)) {
            throw new common_1.BadRequestException('Invalid zone ID');
        }
        return this.stopModel.find({ zoneId, isActive: true }).exec();
    }
    async create(createStopInput) {
        await this.zoneService.findById(createStopInput.zoneId);
        const createdStop = new this.stopModel(createStopInput);
        return createdStop.save();
    }
    async update(id, updateStopInput) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid stop ID');
        }
        if (updateStopInput.zoneId) {
            await this.zoneService.findById(updateStopInput.zoneId);
        }
        const updatedStop = await this.stopModel.findByIdAndUpdate(id, { $set: updateStopInput }, { new: true }).exec();
        if (!updatedStop) {
            throw new common_1.NotFoundException(`Stop with ID ${id} not found`);
        }
        return updatedStop;
    }
    async remove(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            throw new common_1.BadRequestException('Invalid stop ID');
        }
        const result = await this.stopModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
        if (!result) {
            throw new common_1.NotFoundException(`Stop with ID ${id} not found`);
        }
        return true;
    }
    async getZoneForStop(stopId) {
        const stop = await this.findById(stopId);
        return this.zoneService.findById(stop.zoneId.toString());
    }
};
exports.StopService = StopService;
exports.StopService = StopService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(stop_schema_1.Stop.name)),
    __metadata("design:paramtypes", [typeof (_a = typeof mongoose_2.Model !== "undefined" && mongoose_2.Model) === "function" ? _a : Object, zone_service_1.ZoneService])
], StopService);
//# sourceMappingURL=stop.service.js.map