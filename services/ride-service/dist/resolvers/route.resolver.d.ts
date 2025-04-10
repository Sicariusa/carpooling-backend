import { Route } from '../schemas/route.schema';
import { RouteService } from '../services/route.service';
import { CreateRouteInput, UpdateRouteInput } from '../dto/route.dto';
export declare class RouteResolver {
    private routeService;
    constructor(routeService: RouteService);
    routes(): Promise<Route[]>;
    route(id: string): Promise<Route>;
    createRoute(input: CreateRouteInput): Promise<Route>;
    updateRoute(id: string, input: UpdateRouteInput): Promise<Route>;
    removeRoute(id: string): Promise<boolean>;
    stops(route: Route): Promise<any[]>;
}
