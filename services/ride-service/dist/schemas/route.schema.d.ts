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
export declare const RouteSchema: import("mongoose").Schema<Route, import("mongoose").Model<Route, any, any, any, Document<unknown, any, Route> & Route & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Route, Document<unknown, {}, import("mongoose").FlatRecord<Route>> & import("mongoose").FlatRecord<Route> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
