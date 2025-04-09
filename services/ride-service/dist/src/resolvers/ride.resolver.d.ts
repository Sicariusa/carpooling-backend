import { Ride } from '../schemas/ride.schema';
import { RideService } from '../services/ride.service';
import { CreateRideInput, SearchRideInput, UpdateRideInput, BookingDeadlineInput, ModifyDestinationInput } from '../dto/ride.dto';
export declare class RideResolver {
    private rideService;
    constructor(rideService: RideService);
    rides(): Promise<Ride[]>;
    ride(id: string): Promise<Ride>;
    searchRides(searchInput: SearchRideInput): Promise<Ride[]>;
    calculateFare(rideId: string, pickupStopId: string, dropoffStopId: string): Promise<number>;
    myRides(context: any): Promise<Ride[]>;
    myRideHistory(context: any): Promise<Ride[]>;
    myBookings(context: any): Promise<Ride[]>;
    createRide(createRideInput: CreateRideInput, context: any): Promise<Ride>;
    updateRide(id: string, updateRideInput: UpdateRideInput, context: any): Promise<Ride>;
    setRideGirlsOnly(id: string, girlsOnly: boolean, context: any): Promise<Ride>;
    cancelRide(id: string, context: any): Promise<Ride>;
    setBookingDeadline(input: BookingDeadlineInput, context: any): Promise<Ride>;
    acceptBookingRequest(bookingId: string, rideId: string, context: any): Promise<Ride>;
    rejectBookingRequest(bookingId: string, rideId: string, context: any): Promise<Ride>;
    modifyDropoffLocation(input: ModifyDestinationInput, context: any): Promise<boolean>;
}
