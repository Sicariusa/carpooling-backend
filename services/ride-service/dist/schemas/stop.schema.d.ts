import { Document, Types } from 'mongoose';
import { Zone } from './zone.schema';
export type StopDocument = Stop & Document;
export declare class Stop {
    _id: Types.ObjectId;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    zoneId: Types.ObjectId;
    zone: Zone;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const StopSchema: import("mongoose").Schema<Stop, import("mongoose").Model<Stop, any, any, any, Document<unknown, any, Stop> & Stop & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Stop, Document<unknown, {}, import("mongoose").FlatRecord<Stop>> & import("mongoose").FlatRecord<Stop> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
