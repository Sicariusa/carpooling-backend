import { Document, Types } from 'mongoose';
export type ZoneDocument = Zone & Document;
export declare class Zone {
    _id: Types.ObjectId;
    name: string;
    description: string;
    distanceFromGIU: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ZoneSchema: any;
