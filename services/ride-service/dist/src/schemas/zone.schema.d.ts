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
export declare const ZoneSchema: import("mongoose").Schema<Zone, import("mongoose").Model<Zone, any, any, any, Document<unknown, any, Zone> & Zone & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Zone, Document<unknown, {}, import("mongoose").FlatRecord<Zone>> & import("mongoose").FlatRecord<Zone> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
