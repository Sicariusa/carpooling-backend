import { Document, Types } from 'mongoose';
import { Stop } from './stop.schema';
export type RouteDocument = Route & Document;
export declare class RouteStop {
    stopId: Types.ObjectId;
    sequence: number;
    stop: Stop;
}
export declare class Route {
    _id: Types.ObjectId;
    name: string;
    description: string;
    totalDistance: number;
    stops: RouteStop[];
    startFromGIU: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const RouteSchema: any;
