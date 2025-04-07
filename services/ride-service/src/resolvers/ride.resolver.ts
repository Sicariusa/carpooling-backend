import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Ride, RideStatus } from '../schemas/ride.schema';
import { Route } from '../schemas/route.schema';
import { RideService } from '../services/ride.service';
import { CreateRideInput, SearchRideInput, UpdateRideInput, BookingDeadlineInput } from '../dto/ride.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RoleGuard } from '../guards/role.guard';
import { Roles } from '../decorators/roles.decorator';

@Resolver(() => Ride)
export class RideResolver {
  constructor(private rideService: RideService) {}

  @Query(() => [Ride])
  async rides() {
    return this.rideService.findAll();
  }

  @Query(() => Ride)
  async ride(@Args('id', { type: () => ID }) id: string) {
    return this.rideService.findById(id);
  }

  @Query(() => [Ride])
  async searchRides(@Args('searchInput') searchInput: SearchRideInput) {
    return this.rideService.searchRides(searchInput);
  }

  @Query(() => [Ride])
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('DRIVER')
  async myRides(@Context() context) {
    const { user } = context.req;
    return this.rideService.findByDriver(user.id);
  }

  @Query(() => [Ride])
  @UseGuards(AuthGuard)
  async myRideHistory(@Context() context) {
    const { user } = context.req;
    return this.rideService.findRideHistory(user.id);
  }

  @Query(() => [Ride])
  @UseGuards(AuthGuard)
  async myBookings(@Context() context) {
    const { user } = context.req;
    return this.rideService.findUserBookings(user.id);
  }

  @Mutation(() => Ride)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('DRIVER')
  async createRide(
    @Args('createRideInput') createRideInput: CreateRideInput,
    @Context() context
  ) {
    const { user } = context.req;
    return this.rideService.create(createRideInput, user.id);
  }

  @Mutation(() => Ride)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('DRIVER')
  async updateRide(
    @Args('id', { type: () => ID }) id: string,
    @Args('updateRideInput') updateRideInput: UpdateRideInput,
    @Context() context
  ) {
    const { user } = context.req;
    return this.rideService.update(id, updateRideInput, user.id);
  }

  @Mutation(() => Ride)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('DRIVER')
  async setRideGirlsOnly(
    @Args('id', { type: () => ID }) id: string,
    @Args('girlsOnly', { type: () => Boolean }) girlsOnly: boolean,
    @Context() context
  ) {
    const { user } = context.req;
    const updateInput: UpdateRideInput = { girlsOnly };
    return this.rideService.update(id, updateInput, user.id);
  }

  @Mutation(() => Ride)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('DRIVER')
  async cancelRide(
    @Args('id', { type: () => ID }) id: string,
    @Context() context
  ) {
    const { user } = context.req;
    return this.rideService.cancelRide(id, user.id);
  }

  @Mutation(() => Ride)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('DRIVER')
  async setBookingDeadline(
    @Args('input') input: BookingDeadlineInput,
    @Context() context
  ) {
    const { user } = context.req;
    return this.rideService.setBookingDeadline(input.rideId, input.minutesBeforeDeparture, user.id);
  }

  @ResolveField(() => Route)
  async route(@Parent() ride: Ride) {
    return this.rideService.getRouteForRide(ride._id.toString());
  }
}
