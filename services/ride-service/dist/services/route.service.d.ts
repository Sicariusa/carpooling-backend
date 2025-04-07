import { Model } from 'mongoose';
import { Route, RouteDocument } from '../schemas/route.schema';
import { CreateRouteInput, UpdateRouteInput } from '../dto/route.dto';
import { StopService } from './stop.service';
import { ZoneService } from './zone.service';
export declare class RouteService {
    private routeModel;
    private stopService;
    private zoneService;
    constructor(routeModel: Model<RouteDocument>, stopService: StopService, zoneService: ZoneService);
    findAll(): Promise<Route[]>;
    findById(id: string): Promise<Route>;
    create(createRouteInput: CreateRouteInput): Promise<Route>;
    update(id: string, updateRouteInput: UpdateRouteInput): Promise<Route>;
    remove(id: string): Promise<boolean>;
    getStopsForRoute(routeId: string): Promise<any[]>;
}
