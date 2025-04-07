import { Ride } from '../schemas/ride.schema';
import { RideService } from '../services/ride.service';
import { CreateRideInput, SearchRideInput, UpdateRideInput, BookingDeadlineInput } from '../dto/ride.dto';
export declare class RideResolver {
    private rideService;
    constructor(rideService: RideService);
    rides(): Promise<Ride[]>;
    ride(id: string): Promise<Ride>;
    searchRides(searchInput: SearchRideInput): Promise<Ride[]>;
    myRides(context: any): Promise<Ride[]>;
    myRideHistory(context: any): Promise<Ride[]>;
    myBookings(context: any): Promise<Ride[]>;
    createRide(createRideInput: CreateRideInput, context: any): Promise<Ride>;
    updateRide(id: string, updateRideInput: UpdateRideInput, context: any): Promise<Ride>;
    setRideGirlsOnly(id: string, girlsOnly: boolean, context: any): Promise<Ride>;
    cancelRide(id: string, context: any): Promise<Ride>;
    setBookingDeadline(input: BookingDeadlineInput, context: any): Promise<Ride>;
    route(ride: Ride): Promise<any>;
}
