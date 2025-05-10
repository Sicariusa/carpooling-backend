import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Route, RouteDocument } from '../schemas/route.schema';

@Injectable()
export class RouteService {
  constructor(@InjectModel(Route.name) private routeModel: Model<RouteDocument>) {}

  async findById(routeId: string | Types.ObjectId): Promise<Route> {
    const route = await this.routeModel.findById(routeId);
    if (!route) {
      throw new NotFoundException(`Route with ID ${routeId} not found`);
    }
    return route;
  }

  async findByZone(zoneId: string): Promise<Route[]> {
    if (!Types.ObjectId.isValid(zoneId)) {
      throw new NotFoundException('Invalid zone ID');
    }
    return this.routeModel.find({ zoneId: new Types.ObjectId(zoneId) }).exec();
  }
}
