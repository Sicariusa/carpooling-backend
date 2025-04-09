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
export declare const StopSchema: any;
