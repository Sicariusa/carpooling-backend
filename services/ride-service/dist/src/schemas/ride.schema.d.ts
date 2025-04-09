import { Document, Types } from 'mongoose';
import { Route } from './route.schema';
export type RideDocument = Ride & Document;
export declare enum RideStatus {
    SCHEDULED = "SCHEDULED",
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare class Ride {
    _id: Types.ObjectId;
    driverId: string;
    routeId: Types.ObjectId;
    route: Route;
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
export declare const RideSchema: any;
