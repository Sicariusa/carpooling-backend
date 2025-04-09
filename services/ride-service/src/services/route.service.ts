import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Route, RouteDocument, RouteStop } from '../schemas/route.schema';
import { CreateRouteInput, CreateRouteStopInput, UpdateRouteInput } from '../dto/route.dto';
import { StopService } from './stop.service';
import { ZoneService } from './zone.service';

@Injectable()
export class RouteService {
  constructor(
    @InjectModel(Route.name) private routeModel: Model<RouteDocument>,
    private stopService: StopService,
    private zoneService: ZoneService,
  ) {}

  async findAll(): Promise<Route[]> {
    return this.routeModel.find({ isActive: true }).exec();
  }

  async findById(id: string): Promise<Route> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid route ID');
    }
    
    const route = await this.routeModel.findById(id).exec();
    if (!route) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }
    
    return route;
  }

  async create(createRouteInput: CreateRouteInput): Promise<Route> {
    const { stops, ...routeData } = createRouteInput;
    
    // Validate that all stops exist and are in correct order (closer to GIU)
    const routeStops: RouteStop[] = [];
    
    for (let i = 0; i < stops.length; i++) {
      const stopInput = stops[i];
      
      // Validate that the stop exists
      await this.stopService.findById(stopInput.stopId);
      
      // Add stop to the route
      routeStops.push({
        stopId: new Types.ObjectId(stopInput.stopId),
        sequence: stopInput.sequence || i + 1,
        stop: null, // Will be populated on query
      });
    }
    
    // Validate route direction (must have GIU as either first or last stop)
    if (routeStops.length < 2) {
      throw new BadRequestException('Route must have at least 2 stops');
    }
    
    // Validate that either first or last stop is GIU
    const firstStop = await this.stopService.findById(routeStops[0].stopId.toString());
    const lastStop = await this.stopService.findById(routeStops[routeStops.length - 1].stopId.toString());
    
    const firstZone = await this.zoneService.findById(firstStop.zoneId.toString());
    const lastZone = await this.zoneService.findById(lastStop.zoneId.toString());
    
    const hasGIUAtEnds = (firstZone.distanceFromGIU === 0) || (lastZone.distanceFromGIU === 0);
    if (!hasGIUAtEnds) {
      throw new BadRequestException('Route must have GIU as either the first or last stop');
    }
    
    // Set startFromGIU based on the route direction
    const startFromGIU = firstZone.distanceFromGIU === 0;
    
    // Create the route
    const createdRoute = new this.routeModel({
      ...routeData,
      stops: routeStops,
      startFromGIU,
    });
    
    return createdRoute.save();
  }

  async update(id: string, updateRouteInput: UpdateRouteInput): Promise<Route> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid route ID');
    }
    
    const { stops, ...routeData } = updateRouteInput;
    const updateData: any = { ...routeData };
    
    // If updating stops, validate them
    if (stops && stops.length > 0) {
      const routeStops: RouteStop[] = [];
      
      for (let i = 0; i < stops.length; i++) {
        const stopInput = stops[i];
        
        // Validate that the stop exists
        await this.stopService.findById(stopInput.stopId);
        
        // Add stop to the route
        routeStops.push({
          stopId: new Types.ObjectId(stopInput.stopId),
          sequence: stopInput.sequence || i + 1,
          stop: null, // Will be populated on query
        });
      }
      
      // Validate route direction (must have GIU as either first or last stop)
      if (routeStops.length < 2) {
        throw new BadRequestException('Route must have at least 2 stops');
      }
      
      // Validate that either first or last stop is GIU
      const firstStop = await this.stopService.findById(routeStops[0].stopId.toString());
      const lastStop = await this.stopService.findById(routeStops[routeStops.length - 1].stopId.toString());
      
      const firstZone = await this.zoneService.findById(firstStop.zoneId.toString());
      const lastZone = await this.zoneService.findById(lastStop.zoneId.toString());
      
      const hasGIUAtEnds = (firstZone.distanceFromGIU === 0) || (lastZone.distanceFromGIU === 0);
      if (!hasGIUAtEnds) {
        throw new BadRequestException('Route must have GIU as either the first or last stop');
      }
      
      // Set startFromGIU based on the route direction
      updateData.startFromGIU = firstZone.distanceFromGIU === 0;
      updateData.stops = routeStops;
    }
    
    const updatedRoute = await this.routeModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).exec();
    
    if (!updatedRoute) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }
    
    return updatedRoute;
  }

  async remove(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid route ID');
    }
    
    const result = await this.routeModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true },
    ).exec();
    
    if (!result) {
      throw new NotFoundException(`Route with ID ${id} not found`);
    }
    
    return true;
  }

  async getStopsForRoute(routeId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(routeId)) {
      throw new BadRequestException('Invalid route ID');
    }

    const route = await this.routeModel.findById(routeId).exec();
    if (!route) {
      throw new NotFoundException(`Route with ID ${routeId} not found`);
    }

    // Extract stopIds from the route
    const stopIds = route.stops.map(stop => stop.stopId);

    // Fetch all stops individually
    const stops = await Promise.all(
      stopIds.map(stopId => this.stopService.findById(stopId.toString()))
    );

    // Combine route stop info (sequence) with actual stop details
    return route.stops.map(routeStop => {
      const stop = stops.find(s => s._id.toString() === routeStop.stopId.toString());
      
      // If stop not found, return minimal info
      if (!stop) {
        return {
          _id: routeStop.stopId,
          sequence: routeStop.sequence,
          missing: true
        };
      }

      // Create a plain object from the stop document
      return {
        _id: stop._id,
        name: stop.name,
        address: stop.address,
        latitude: stop.latitude,
        longitude: stop.longitude,
        zoneId: stop.zoneId,
        zone: stop.zone,
        isActive: stop.isActive,
        createdAt: stop.createdAt,
        updatedAt: stop.updatedAt,
        sequence: routeStop.sequence
      };
    }).sort((a, b) => a.sequence - b.sequence);
  }

  async getStopDetails(stopId: string): Promise<any> {
    if (!Types.ObjectId.isValid(stopId)) {
      throw new BadRequestException('Invalid stop ID');
    }

    const stop = await this.stopService.findById(stopId);
    if (!stop) {
      throw new NotFoundException(`Stop with ID ${stopId} not found`);
    }

    return stop;
  }
}
