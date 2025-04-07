import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Stop, StopDocument } from '../schemas/stop.schema';
import { CreateStopInput, UpdateStopInput } from '../dto/stop.dto';
import { ZoneService } from './zone.service';

@Injectable()
export class StopService {
  constructor(
    @InjectModel(Stop.name) private stopModel: Model<StopDocument>,
    private zoneService: ZoneService,
  ) {}

  async findAll(): Promise<Stop[]> {
    return this.stopModel.find({ isActive: true }).exec();
  }

  async findById(id: string): Promise<Stop> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid stop ID');
    }
    
    const stop = await this.stopModel.findById(id).exec();
    if (!stop) {
      throw new NotFoundException(`Stop with ID ${id} not found`);
    }
    
    return stop;
  }

  async findByZone(zoneId: string): Promise<Stop[]> {
    if (!Types.ObjectId.isValid(zoneId)) {
      throw new BadRequestException('Invalid zone ID');
    }
    
    return this.stopModel.find({ zoneId, isActive: true }).exec();
  }

  async create(createStopInput: CreateStopInput): Promise<Stop> {
    // Validate that the zone exists
    await this.zoneService.findById(createStopInput.zoneId);
    
    const createdStop = new this.stopModel(createStopInput);
    return createdStop.save();
  }

  async update(id: string, updateStopInput: UpdateStopInput): Promise<Stop> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid stop ID');
    }
    
    // If updating the zone, validate that the new zone exists
    if (updateStopInput.zoneId) {
      await this.zoneService.findById(updateStopInput.zoneId);
    }
    
    const updatedStop = await this.stopModel.findByIdAndUpdate(
      id,
      { $set: updateStopInput },
      { new: true },
    ).exec();
    
    if (!updatedStop) {
      throw new NotFoundException(`Stop with ID ${id} not found`);
    }
    
    return updatedStop;
  }

  async remove(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid stop ID');
    }
    
    const result = await this.stopModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).exec();
    
    if (!result) {
      throw new NotFoundException(`Stop with ID ${id} not found`);
    }
    
    return true;
  }

  async getZoneForStop(stopId: string): Promise<any> {
    const stop = await this.findById(stopId);
    return this.zoneService.findById(stop.zoneId.toString());
  }
}
