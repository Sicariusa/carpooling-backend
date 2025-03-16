import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { RideService } from './ride.service';
import { Ride, RideStatus } from './ride.model';
import { CreateRideInput, UpdateRideInput, SearchRideInput } from './dto/ride.dto';

@Resolver(() => Ride)
export class RideResolver {
  constructor(private readonly rideService: RideService) {}

  @Query(() => [Ride])
  async getAllRides() {
    return this.rideService.getAllRides();
  }

  @Query(() => Ride)
  async getRideById(@Args('id') id: string) {
    return this.rideService.getRideById(id);
  }

  @Query(() => [Ride])
  async searchRides(@Args('searchParams') searchParams: SearchRideInput) {
    return this.rideService.searchRides(searchParams);
  }

  @Query(() => [Ride])
  async getDriverRides(@Args('driverId') driverId: string) {
    return this.rideService.getDriverRides(driverId);
  }

  @Mutation(() => Ride)
  async createRide(@Args('data') data: CreateRideInput) {
    return this.rideService.createRide(data);
  }

  @Mutation(() => Ride)
  async updateRide(@Args('id') id: string, @Args('data') data: UpdateRideInput) {
    return this.rideService.updateRide(id, data);
  }

  @Mutation(() => Ride)
  async deleteRide(@Args('id') id: string) {
    return this.rideService.deleteRide(id);
  }

  @Mutation(() => Ride)
  async setRideStatus(
    @Args('id') id: string, 
    @Args('status') status: RideStatus
  ) {
    return this.rideService.updateRide(id, { status });
  }

  @Mutation(() => Ride)
  async setRideAsGirlsOnly(
    @Args('id') id: string, 
    @Args('isGirlsOnly') isGirlsOnly: boolean
  ) {
    return this.rideService.updateRide(id, { isGirlsOnly });
  }

  // @Mutation(() => Boolean)
  // async notifyDriver(
  //   @Args('rideId') rideId: string,
  //   @Args('action') action: 'booked' | 'cancelled',
  //   @Args('passengerId') passengerId: string
  // ) {
  //   return this.rideService.notifyDriver(rideId, action, passengerId);
  // }
}