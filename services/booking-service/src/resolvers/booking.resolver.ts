import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { CreateBookingInput, BookingStatus } from '../dto/booking.dto';
import { Booking } from '../schema/booking.schema';
import { BookingService } from '../services/booking.service';
import { UnauthorizedException, UseGuards } from '@nestjs/common';

@Resolver(() => Booking)
export class BookingResolver {
  constructor(private readonly bookingService: BookingService) { }


  @Query(() => [Booking])
  async AllBookings(@Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to view bookings');
    }

    // Only admins can view all bookings
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('Only administrators can view all bookings');
    }

    return this.bookingService.getAllBookings();
  }

  @Query(() => [Booking])
  async MyBookings(@Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to view your bookings');
    }

    return this.bookingService.getUserBookings(user.id);
  }

  @Query(() => Booking)
  async getBooking(@Args('id', { type: () => ID }) id: string, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to view a booking');
    }

    const booking = await this.bookingService.getBookingById(id);

    // Check if user is admin or the booking belongs to the user
    if (user.role === 'ADMIN' || booking.userId === user.id) {
      return booking;
    }

    throw new UnauthorizedException('You are not authorized to view this booking');
  }

  //getridebookings
  @Query(() => [Booking])
  async getRideBookings(@Context() context, @Args('rideId', { type: () => ID }) rideId: string) {
    const user = context.req.user;
    console.log(user);
    console.log(rideId);
    if (!user) {
      throw new UnauthorizedException('You must be logged in to view ride bookings');
    }
    if (user.role !== 'DRIVER') {
      throw new UnauthorizedException('You are not authorized to view ride bookings ONLY DRIVERS');
    }
    return this.bookingService.getRideBookings(rideId);
  }

  @Mutation(() => Booking)
  async BookRide(@Args('data') data: CreateBookingInput, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to book a ride');
    }

    // Admins and Drivers cannot book rides
    if (user.role === 'ADMIN' || user.role === 'DRIVER') {
      throw new UnauthorizedException('Admins and Drivers cannot book rides');
    }

    return this.bookingService.BookRide(data, user.id, context); // Pass context here
  }


  @Mutation(() => Booking)
  async cancelBooking(
    @Args('id', { type: () => ID }) id: string,
    @Context() context
  ) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to cancel a booking');
    }

    return this.bookingService.cancelBooking(id, user.id);
  }

  @Mutation(() => Booking)
  async acceptBooking(
    @Args('id', { type: () => ID }) id: string,
    @Context() context
  ) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to accept a booking');
    }
    if (user.role !== 'DRIVER') {
      throw new UnauthorizedException('You are not authorized to accept bookings ONLY DRIVERS');
    }

    return this.bookingService.acceptBooking(id, user.id);
  }

  @Mutation(() => Booking)
  async rejectBooking(
    @Args('id', { type: () => ID }) id: string,
    @Context() context
  ) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to reject a booking');
    }
    if (user.role !== 'DRIVER') {
      throw new UnauthorizedException('You are not authorized to reject bookings ONLY DRIVERS');
    }

    return this.bookingService.rejectBooking(id, user.id);
  }

  @Mutation(() => Booking)
  async internalConfirmBooking(@Args('id', { type: () => ID }) id: string) {
    return this.bookingService.confirmBookingFromWebhook(id);
  }

}