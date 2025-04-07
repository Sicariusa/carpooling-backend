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
    return this.zoneModel.find({ isActive: true }).sort({ distanceFromGIU: 1 }).exec();
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
    // Check if zone with the same name already exists
    const existingZone = await this.zoneModel.findOne({ name: createZoneInput.name }).exec();
    if (existingZone) {
      throw new BadRequestException(`Zone with name ${createZoneInput.name} already exists`);
    }
    
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
      { new: true },
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
      { new: true },
    ).exec();
    
    if (!result) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }
    
    return true;
  }

  async validateZoneDirection(fromZoneId: string, toZoneId: string): Promise<boolean> {
    const fromZone = await this.findById(fromZoneId);
    const toZone = await this.findById(toZoneId);
    
    // If going to GIU (toZone)
    if (toZone.distanceFromGIU === 0) {
      return true; // Always allow going to GIU
    }
    
    // If starting from GIU (fromZone)
    if (fromZone.distanceFromGIU === 0) {
      return true; // Always allow starting from GIU
    }
    
    // Otherwise, we can only go to zones closer to GIU
    return fromZone.distanceFromGIU > toZone.distanceFromGIU;
  }
}
