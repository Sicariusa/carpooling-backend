import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { CreateBookingInput, BookingStatus } from '../dto/booking.dto';
import { Booking } from '../schema/booking.schema';
import { BookingService } from '../services/booking.service';
import { UnauthorizedException } from '@nestjs/common';

@Resolver(() => Booking)
export class BookingResolver {
  constructor(private readonly bookingService: BookingService) {}

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

  @Mutation(() => Booking)
  async BookRide(@Args('data') data: CreateBookingInput, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to book a ride');
    }
    
    // Set the userId from the authenticated user
    data.userId = user.id;
    
    // Get the auth token from the request
    const token = context.req.headers.authorization?.split(' ')[1];
    
    return this.bookingService.BookRide(data, token);
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
    
    // Get the auth token from the request
    const token = context.req.headers.authorization?.split(' ')[1];
    
    return this.bookingService.cancelBooking(id, user.id, token);
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
    
    // Get the auth token from the request
    const token = context.req.headers.authorization?.split(' ')[1];
    
    return this.bookingService.acceptBooking(id, user.id, token);
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
    
    // Get the auth token from the request
    const token = context.req.headers.authorization?.split(' ')[1];
    
    return this.bookingService.rejectBooking(id, user.id, token);
  }
}