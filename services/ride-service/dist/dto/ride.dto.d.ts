import { RideStatus } from '../schemas/ride.schema';
export declare class CreateRideInput {
    routeId: string;
    departureTime: Date;
    totalSeats: number;
    availableSeats: number;
    pricePerSeat: number;
    girlsOnly: boolean;
    startLocation: string;
    endLocation: string;
}
export declare class UpdateRideInput {
    departureTime?: Date;
    totalSeats?: number;
    availableSeats?: number;
    pricePerSeat?: number;
    girlsOnly?: boolean;
    status?: RideStatus;
}
export declare class SearchRideInput {
    fromZoneId?: string;
    toZoneId?: string;
    departureDate?: Date;
    girlsOnly?: boolean;
    minAvailableSeats?: number;
    maxPrice?: number;
}
export declare class BookingDeadlineInput {
    rideId: string;
    minutesBeforeDeparture: number;
}
