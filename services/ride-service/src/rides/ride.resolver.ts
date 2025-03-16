import { Resolver, Query, Mutation, Args, Int, Context } from "@nestjs/graphql";
import { RideService } from './ride.service';
import { Ride, RideStatus } from './ride.model';
import { CreateRideInput, UpdateRideInput, SearchRideInput } from './dto/ride.dto';
import { UnauthorizedException } from '@nestjs/common';

@Resolver(() => Ride)
export class RideResolver {
  constructor(private readonly rideService: RideService) {}

  @Query(() => [Ride])
  async getAllRides(@Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to view rides');
    }
    
    return this.rideService.getAllRides();
  }

  @Query(() => Ride)
  async getRideById(@Args('id') id: string, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to view a ride');
    }
    
    return this.rideService.getRideById(id);
  }

  @Query(() => [Ride])
  async searchRides(@Args('searchParams') searchParams: SearchRideInput, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to search rides');
    }
    
    // If the ride is girls only, check if the user is female
    if (searchParams.isGirlsOnly && user.gender !== 'FEMALE') {
      throw new UnauthorizedException('You are not authorized to view girls-only rides');
    }
    
    return this.rideService.searchRides(searchParams);
  }

  @Query(() => [Ride])
  async getDriverRides(@Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to view your rides');
    }
    
    return this.rideService.getDriverRides(user.id);
  }

  @Mutation(() => Ride)
  async createRide(@Args('data') data: CreateRideInput, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to create a ride');
    }
    
    // Set the driverId from the authenticated user
    data.driverId = user.id;
    
    return this.rideService.createRide(data);
  }

  @Mutation(() => Ride)
  async updateRide(@Args('id') id: string, @Args('data') data: UpdateRideInput, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to update a ride');
    }
    
    const ride = await this.rideService.getRideById(id);
    
    // Check if user is admin or the driver of the ride
    if (user.role === 'ADMIN' || ride.driverId === user.id) {
      return this.rideService.updateRide(id, data);
    }
    
    throw new UnauthorizedException('You are not authorized to update this ride');
  }

  @Mutation(() => Ride)
  async deleteRide(@Args('id') id: string, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to delete a ride');
    }
    
    const ride = await this.rideService.getRideById(id);
    
    // Check if user is admin or the driver of the ride
    if (user.role === 'ADMIN' || ride.driverId === user.id) {
      return this.rideService.deleteRide(id);
    }
    
    throw new UnauthorizedException('You are not authorized to delete this ride');
  }

  @Mutation(() => Ride)
  async setRideStatus(
    @Args('id') id: string, 
    @Args('status') status: RideStatus,
    @Context() context
  ) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to update ride status');
    }
    
    const ride = await this.rideService.getRideById(id);
    
    // Check if user is admin or the driver of the ride
    if (user.role === 'ADMIN' || ride.driverId === user.id) {
      return this.rideService.updateRide(id, { status });
    }
    
    throw new UnauthorizedException('You are not authorized to update this ride status');
  }

  @Mutation(() => Ride)
  async setRideAsGirlsOnly(
    @Args('id') id: string, 
    @Args('isGirlsOnly') isGirlsOnly: boolean,
    @Context() context
  ) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to update ride settings');
    }
    
    const ride = await this.rideService.getRideById(id);
    
    // Check if user is admin or the driver of the ride
    if (user.role === 'ADMIN' || ride.driverId === user.id) {
      return this.rideService.updateRide(id, { isGirlsOnly });
    }
    
    throw new UnauthorizedException('You are not authorized to update this ride setting');
  }

  @Mutation(() => Ride)
  async updateAvailableSeats(
    @Args('id') id: string,
    @Args('change', { type: () => Int }) change: number,
    @Context() context
  ) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to update available seats');
    }
    
    const ride = await this.rideService.getRideById(id);
    
    // Check if user is admin or the driver of the ride
    if (user.role === 'ADMIN' || ride.driverId === user.id) {
      return this.rideService.updateAvailableSeats(id, change);
    }
    
    throw new UnauthorizedException('You are not authorized to update available seats for this ride');
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