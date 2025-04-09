import { Document, Types } from 'mongoose';
export type RideDocument = Ride & Document;
export declare enum RideStatus {
    SCHEDULED = "SCHEDULED",
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare class RideStop {
    stopId: Types.ObjectId;
    sequence: number;
}
export declare class Ride {
    _id: Types.ObjectId;
    driverId: string;
    stops: RideStop[];
    startFromGIU: boolean;
    departureTime: Date;
    bookingDeadline: Date;
    totalSeats: number;
    availableSeats: number;
    pricePerSeat: number;
    priceScale: number;
    girlsOnly: boolean;
    status: RideStatus;
    startLocation: string;
    endLocation: string;
    bookingIds: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const RideSchema: import("mongoose").Schema<Ride, import("mongoose").Model<Ride, any, any, any, Document<unknown, any, Ride> & Ride & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Ride, Document<unknown, {}, import("mongoose").FlatRecord<Ride>> & import("mongoose").FlatRecord<Ride> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
