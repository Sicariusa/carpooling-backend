import { Resolver, Query, Mutation, Args, ID, Context, Float } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { Ride, RideStatus } from '../schemas/ride.schema';
import { RideService } from '../services/ride.service';
import { CreateRideInput, SearchRideInput, UpdateRideInput, BookingDeadlineInput, ModifyDestinationInput } from '../dto/ride.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RoleGuard } from '../guards/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { StopService } from 'src/services/stop.service';
import { ZoneService } from 'src/services/zone.service';

@Resolver(() => Ride)
export class RideResolver {
  constructor(private rideService: RideService,
    private stopService: StopService,
    private zoneService: ZoneService) { }

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

  @Query(() => Number)
  @UseGuards(AuthGuard)
  async calculateFare(
    @Args('rideId', { type: () => ID }) rideId: string,
    @Args('pickupStopId', { type: () => ID }) pickupStopId: string,
    @Args('dropoffStopId', { type: () => ID }) dropoffStopId: string
  ) {
    return this.rideService.calculateFareForBooking(rideId, pickupStopId, dropoffStopId);
  }

  @Query(() => [Ride])
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('DRIVER')
  async myRides(@Context() context) {
    const { user } = context.req;
    return this.rideService.findByDriver(user.id);
  }

  //get driver's active rides
  @Query(() => [Ride])
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('DRIVER')
  async myActiveRides(@Context() context) {
    const { user } = context.req;
    return this.rideService.findActiveRides(user.id);
  }

  //get driver's scheduled rides
  @Query(() => [Ride])
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('DRIVER')
  async myScheduledRides(@Context() context) {
    const { user } = context.req;
    return this.rideService.findScheduledRides(user.id);
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
    // if (!user.isApproved) {
    //   throw new UnauthorizedException('Your account needs to be approved before you can create a ride');
    // }
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
    return this.rideService.setGirlsOnly(id, girlsOnly, user.id);
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

  @Mutation(() => Ride)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('DRIVER')
  async acceptBookingRequest(
    @Args('bookingId', { type: () => ID }) bookingId: string,
    @Args('rideId', { type: () => ID }) rideId: string,
    @Context() context
  ) {
    const { user } = context.req;
    return this.rideService.acceptBookingRequest(bookingId, rideId, user.id);
  }

  @Mutation(() => Ride)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('DRIVER')
  async rejectBookingRequest(
    @Args('bookingId', { type: () => ID }) bookingId: string,
    @Args('rideId', { type: () => ID }) rideId: string,
    @Context() context
  ) {
    const { user } = context.req;
    return this.rideService.rejectBookingRequest(bookingId, rideId, user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard)
  async modifyDropoffLocation(
    @Args('input') input: ModifyDestinationInput,
    @Context() context
  ) {
    const { user } = context.req;
    return this.rideService.modifyDropoffLocation(
      input.bookingId,
      input.rideId,
      user.id,
      input.newDropoffLocation
    );
  }

  @Query(() => [Ride])
  async getRidesByZone(
    @Args('latitude', { type: () => Float }) latitude: number,
    @Args('longitude', { type: () => Float }) longitude: number
  ): Promise<Ride[]> {
    const closestStop = await this.stopService.findClosestStop(latitude, longitude);

    if (!closestStop) {
      throw new NotFoundException('No stop found near the given coordinates');
    }

    const zone = await this.zoneService.findById(closestStop.zoneId.toString());
    return this.rideService.findRidesByZone(zone._id.toString()); // Fetch rides for the zone
  }
}
