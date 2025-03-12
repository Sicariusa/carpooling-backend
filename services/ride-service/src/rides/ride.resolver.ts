import { Resolver, Query, Mutation, Args } from "@nestjs/graphql";
import { RideService } from './ride.service';
import { Ride } from './ride.model'; // Import the Ride type from Prisma client
import { CreateRideInput, UpdateRideInput } from './dto/ride.dto'; // Import the DTOs

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
}