import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { CreateBookingInput, UpdateBookingInput, BookingFilterInput, BookingStatus } from '../dto/booking.dto';
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
    
    // If user is admin, return all bookings
    if (user.role === 'ADMIN') {
      return this.bookingService.getAllBookings();
    }
    
    // Otherwise, return only user's bookings
    return this.bookingService.getUserBookings(user.id);
  }

  @Query(() => Booking)
  async UserBooking(@Args('id', { type: () => ID }) id: string, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to view a booking');
    }
    
    const booking = await this.bookingService.getBookingById(id);
    
    // Check if user is admin or the booking belongs to the user
    // For drivers, we'll need to check if they're the driver of the associated ride
    if (user.role === 'ADMIN' || booking.userId === user.id) {
      return booking;
    }
    
    // TODO: Check if user is the driver of the ride associated with this booking
    
    throw new UnauthorizedException('You are not authorized to view this booking');
  }

  @Query(() => [Booking])
  async userBookings(@Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to view your bookings');
    }
    
    return this.bookingService.getUserBookings(user.id);
  }

  @Query(() => [Booking])
  async rideBookings(@Args('rideId', { type: () => ID }) rideId: string, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to view ride bookings');
    }
    
    // TODO: Check if user is the driver of the ride
    
    return this.bookingService.getRideBookings(rideId);
  }

  @Query(() => [Booking])
  async filterBookings(@Args('filters') filters: BookingFilterInput, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to filter bookings');
    }
    
    // If user is not admin, restrict to their own bookings
    if (user.role !== 'ADMIN') {
      filters.userId = user.id;
    }
    
    return this.bookingService.filterBookings(filters);
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
  async updateBooking(@Args('data') data: UpdateBookingInput, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to update a booking');
    }
    
    const booking = await this.bookingService.getBookingById(data.id);
    
    // Check if user is admin or the booking belongs to the user
    if (user.role === 'ADMIN' || booking.userId === user.id) {
      return this.bookingService.updateBooking(data.id, data);
    }
    
    throw new UnauthorizedException('You are not authorized to update this booking');
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

  @Mutation(() => Booking)
  async deleteBooking(@Args('id', { type: () => ID }) id: string, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to delete a booking');
    }
    
    // Only admin can delete bookings
    if (user.role !== 'ADMIN') {
      throw new UnauthorizedException('Only administrators can delete bookings');
    }
    
    return this.bookingService.deleteBooking(id);
  }
}