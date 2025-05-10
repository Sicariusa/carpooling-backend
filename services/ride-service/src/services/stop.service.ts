import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Stop, StopDocument } from '../schemas/stop.schema';
import { CreateStopInput, UpdateStopInput } from '../dto/stop.dto';
import { ZoneService } from './zone.service';
import { RouteDocument } from 'src/schemas/route.schema';

@Injectable()
export class StopService {
  constructor(
    @InjectModel(Stop.name) private stopModel: Model<StopDocument>,
    @InjectModel('Route') private routeModel: Model<RouteDocument>,
    @Inject(forwardRef(() => ZoneService))
    private zoneService: ZoneService,
  ) { }

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

    // Verify the zone exists
    await this.zoneService.findById(zoneId);

    // Find all routes in this zone
    const routes = await this.routeModel.find({ zoneId: new Types.ObjectId(zoneId) }).exec();
    
    // Get all stop IDs from all routes
    const stopIds = routes.reduce((acc, route) => {
      return acc.concat(route.stopIds);
    }, []);

    // Find all stops that belong to these routes
    const stops = await this.stopModel.find({
      _id: { $in: stopIds },
      isActive: true
    }).exec();

    return stops;
  }

  async create(createStopInput: CreateStopInput): Promise<Stop> {
    const createdStop = new this.stopModel(createStopInput);
    // Check if the stop is within any zone
    const zone = await this.zoneService.findZoneByCoordinates(
      createStopInput.latitude,
      createStopInput.longitude
    );

    if (!zone) {
      throw new BadRequestException('Stop is not within any defined zone');
    }
    return createdStop.save();
  }

  async update(id: string, updateStopInput: UpdateStopInput): Promise<Stop> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid stop ID');
    }

    const updatedStop = await this.stopModel.findByIdAndUpdate(
      id,
      { $set: updateStopInput },
      { new: true }
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
      { new: true }
    ).exec();

    if (!result) {
      throw new NotFoundException(`Stop with ID ${id} not found`);
    }

    return true;
  }

  async getZoneForStop(stopId: string): Promise<any> {
    const stop = await this.findById(stopId);
    
    // Find a route that contains this stop
    const route = await this.routeModel.findOne({
      stopIds: new Types.ObjectId(stopId)
    }).exec();

    if (!route) {
      throw new NotFoundException(`No route found containing stop ${stopId}`);
    }

    // Get the zone for this route
    return this.zoneService.findById(route.zoneId.toString());
  }

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

    const earthRadiusKm = 6371; // Radius of the Earth in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2));
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  // Find the closest stop to a given coordinate
  async findClosestStop(latitude: number, longitude: number): Promise<Stop> {
    const stops = await this.findAll(); // Fetch all stops
    let closestStop = null;
    let minDistance = Infinity;

    for (const stop of stops) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        stop.latitude,
        stop.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestStop = stop;
      }
    }
    console.log(`Closest stop: ${closestStop._id}, Distance: ${minDistance} km`);
    return closestStop;
  }

  async getSubsequentStops(routeId: string, startStopId: string): Promise<Stop[]> {
    const route = await this.routeModel.findById(routeId).exec();
    const startIndex = route.stopIds.indexOf(new Types.ObjectId(startStopId));
    const subsequentStopIds = route.stopIds.slice(startIndex);
    return this.stopModel.find({ _id: { $in: subsequentStopIds } }).exec();
  }
} 