import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CreateBookingInput, UpdateBookingInput, BookingFilterInput, BookingStatus } from '../dto/booking.dto';
import { Booking } from '../schema/booking.schema';
import { BookingService } from '../services/booking.service';

@Resolver(() => Booking)
export class BookingResolver {
  constructor(private readonly bookingService: BookingService) {}

  @Query(() => [Booking])
  async bookings() {
    return this.bookingService.getAllBookings();
  }

  @Query(() => Booking)
  async booking(@Args('id', { type: () => ID }) id: string) {
    return this.bookingService.getBookingById(id);
  }

  @Query(() => [Booking])
  async userBookings(@Args('userId', { type: () => ID }) userId: string) {
    return this.bookingService.getUserBookings(userId);
  }

  @Query(() => [Booking])
  async rideBookings(@Args('rideId', { type: () => ID }) rideId: string) {
    return this.bookingService.getRideBookings(rideId);
  }

  @Query(() => [Booking])
  async filterBookings(@Args('filters') filters: BookingFilterInput) {
    return this.bookingService.filterBookings(filters);
  }

  @Mutation(() => Booking)
  async BookRide(@Args('data') data: CreateBookingInput) {
    return this.bookingService.BookRide(data);
  }

  @Mutation(() => Booking)
  async updateBooking(@Args('data') data: UpdateBookingInput) {
    return this.bookingService.updateBooking(data.id, data);
  }

  @Mutation(() => Booking)
  async cancelBooking(
    @Args('id', { type: () => ID }) id: string,
    @Args('userId', { type: () => ID }) userId: string
  ) {
    return this.bookingService.cancelBooking(id, userId);
  }

  @Mutation(() => Booking)
  async acceptBooking(
    @Args('id', { type: () => ID }) id: string,
    @Args('driverId', { type: () => ID }) driverId: string
  ) {
    return this.bookingService.acceptBooking(id, driverId);
  }

  @Mutation(() => Booking)
  async rejectBooking(
    @Args('id', { type: () => ID }) id: string,
    @Args('driverId', { type: () => ID }) driverId: string
  ) {
    return this.bookingService.rejectBooking(id, driverId);
  }

  @Mutation(() => Booking)
  async deleteBooking(@Args('id', { type: () => ID }) id: string) {
    return this.bookingService.deleteBooking(id);
  }
}