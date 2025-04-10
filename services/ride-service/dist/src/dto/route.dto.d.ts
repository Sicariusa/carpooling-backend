export declare class CreateRouteStopInput {
    stopId: string;
    sequence?: number;
}
export declare class CreateRouteInput {
    name: string;
    description: string;
    totalDistance: number;
    stops: CreateRouteStopInput[];
}
export declare class UpdateRouteInput {
    name?: string;
    description?: string;
    totalDistance?: number;
    stops?: CreateRouteStopInput[];
    isActive?: boolean;
}
