import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Zone, ZoneDocument } from '../schemas/zone.schema';
import { CreateZoneInput, UpdateZoneInput } from '../dto/zone.dto';
import { StopService } from './stop.service';

@Injectable()
export class ZoneService {
  constructor(
    @InjectModel(Zone.name) private zoneModel: Model<ZoneDocument>,
    @Inject(forwardRef(() => StopService))
    private stopService: StopService,
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
    // Check for overlapping zones
    const overlappingZone = await this.findOverlappingZone(
      createZoneInput.centerLatitude,
      createZoneInput.centerLongitude,
      createZoneInput.radius
    );

    if (overlappingZone) {
      throw new BadRequestException(
        `Zone overlaps with existing zone: ${overlappingZone.name}. ` +
        `Please adjust the center coordinates or radius.`
      );
    }

    const createdZone = new this.zoneModel(createZoneInput);
    return createdZone.save();
  }

  async update(id: string, updateZoneInput: UpdateZoneInput): Promise<Zone> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid zone ID');
    }

    // If updating location or radius, check for overlaps
    if (updateZoneInput.centerLatitude || updateZoneInput.centerLongitude || updateZoneInput.radius) {
      const zone = await this.findById(id);
      const overlappingZone = await this.findOverlappingZone(
        updateZoneInput.centerLatitude || zone.centerLatitude,
        updateZoneInput.centerLongitude || zone.centerLongitude,
        updateZoneInput.radius || zone.radius,
        id // Exclude current zone from overlap check
      );

      if (overlappingZone) {
        throw new BadRequestException(
          `Zone overlaps with existing zone: ${overlappingZone.name}. ` +
          `Please adjust the center coordinates or radius.`
        );
      }
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

  // Find the zone that the coordinates are in
  async findZoneByCoordinates(latitude: number, longitude: number): Promise<Zone | null> {
    const zones = await this.findAll();
    
    for (const zone of zones) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        zone.centerLatitude,
        zone.centerLongitude
      );
      
      if (distance <= zone.radius) {
        return zone;
      }
    }
    
    return null;
  }

  private async findOverlappingZone(
    latitude: number,
    longitude: number,
    radius: number,
    excludeZoneId?: string
  ): Promise<Zone | null> {
    const zones = await this.findAll();
    
    for (const zone of zones) {
      // Skip the zone being updated
      if (excludeZoneId && zone._id.toString() === excludeZoneId) {
        continue;
      }

      const distance = this.calculateDistance(
        latitude,
        longitude,
        zone.centerLatitude,
        zone.centerLongitude
      );
      
      // If the sum of radii is greater than the distance between centers, zones overlap
      if (distance < (radius + zone.radius)) {
        return zone;
      }
    }
    
    return null;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
} 