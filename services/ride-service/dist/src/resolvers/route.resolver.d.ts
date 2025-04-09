import { Route } from '../schemas/route.schema';
import { RouteService } from '../services/route.service';
import { CreateRouteInput, UpdateRouteInput } from '../dto/route.dto';
export declare class RouteResolver {
    private routeService;
    constructor(routeService: RouteService);
    routes(): Promise<any>;
    route(id: string): Promise<any>;
    createRoute(input: CreateRouteInput): Promise<any>;
    updateRoute(id: string, input: UpdateRouteInput): Promise<any>;
    removeRoute(id: string): Promise<any>;
    stops(route: Route): Promise<any>;
}
