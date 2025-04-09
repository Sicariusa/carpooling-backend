import { RideStatus } from '../schemas/ride.schema';
export declare class RideStopInput {
    stopId: string;
    sequence: number;
}
export declare class CreateRideInput {
    stops: RideStopInput[];
    departureTime: Date;
    totalSeats: number;
    availableSeats: number;
    pricePerSeat: number;
    priceScale: number;
    girlsOnly: boolean;
    startLocation: string;
    endLocation: string;
}
export declare class UpdateRideInput {
    stops?: RideStopInput[];
    departureTime?: Date;
    totalSeats?: number;
    availableSeats?: number;
    pricePerSeat?: number;
    priceScale?: number;
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
export declare class ModifyDestinationInput {
    bookingId: string;
    rideId: string;
    newDropoffLocation: string;
}
