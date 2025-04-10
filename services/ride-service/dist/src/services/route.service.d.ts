import { Model } from 'mongoose';
import { StopService } from './stop.service';
export declare class RouteService {
    private routeModel;
    private stopService;
    constructor(routeModel: Model<any>, stopService: StopService);
    findById(id: string): Promise<any>;
    getStopsForRoute(routeId: string): Promise<any[]>;
    getStopDetails(stopId: string): Promise<any>;
}
