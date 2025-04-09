import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { CreateZoneInput, UpdateZoneInput } from '../dto/zone.dto';

@Injectable()
export class ZoneService {
  constructor(
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
  ) {}

  async findAll(): Promise<Zone[]> {
    return this.zoneModel.find({ isActive: true }).exec();
  }

  async findById(id: string): Promise<Zone> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid zone ID');
    }
    
    const zone = await this.zoneModel.findById(id).exec();
    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }
    
    return zone;
  }

  async create(createZoneInput: CreateZoneInput): Promise<Zone> {
    const createdZone = new this.zoneModel(createZoneInput);
    return createdZone.save();
  }

  async update(id: string, updateZoneInput: UpdateZoneInput): Promise<Zone> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid zone ID');
    }
    
    const updatedZone = await this.zoneModel.findByIdAndUpdate(
      id,
      { $set: updateZoneInput },
      { new: true }
    ).exec();
    
    if (!updatedZone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }
    
    return updatedZone;
  }

  async remove(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid zone ID');
    }
    
    const result = await this.zoneModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).exec();
    
    if (!result) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }
    
    return true;
  }

  async validateZoneDirection(fromZoneId: string, toZoneId: string): Promise<boolean> {
    const fromZone = await this.findById(fromZoneId);
    const toZone = await this.findById(toZoneId);
    
    // Valid transitions are always in one direction: 
    // either moving further from GIU or moving closer to GIU
    
    // Determine if the direction is valid
    const isMovingAwayFromGIU = toZone.distanceFromGIU > fromZone.distanceFromGIU;
    const isMovingTowardsGIU = toZone.distanceFromGIU < fromZone.distanceFromGIU;
    
    // Either direction is valid, but not back and forth
    return isMovingAwayFromGIU || isMovingTowardsGIU;
  }
} 