import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { RideService } from "./ride.service";
import { Ride } from "./ride.model";
import { CreateRideInput, UpdateRideInput } from "./dto/ride.dto";

@Resolver(() => Ride)
export class RideResolver {
  constructor(private readonly rideService: RideService) {}

  // ✅ Get all rides (optionally filter for girls-only rides)
  @Query(() => [Ride])
  async getAllRides(@Args("girlsOnly", { nullable: true }) girlsOnly?: boolean) {
    return this.rideService.getAllRides(girlsOnly);
  }

  // ✅ Search for rides going to GIU
  @Query(() => [Ride])
  async searchRidesGoingToGIU() {
    return this.rideService.searchRidesGoingToGIU();
  }

  // ✅ Search for rides leaving from GIU
  @Query(() => [Ride])
  async searchRidesLeavingGIU() {
    return this.rideService.searchRidesLeavingGIU();
  }

  // ✅ Create a ride (validates GIU rule)
  @Mutation(() => Ride)
  async createRide(@Args("data") data: CreateRideInput) {
    return this.rideService.createRide(data);
  }

  // ✅ Update a ride
  @Mutation(() => Ride)
  async updateRide(@Args("id") id: string, @Args("data") data: UpdateRideInput) {
    return this.rideService.updateRide(id, data);
  }

  // ✅ Delete a ride
  @Mutation(() => Ride)
  async deleteRide(@Args("id") id: string) {
    return this.rideService.deleteRide(id);
  }
}
