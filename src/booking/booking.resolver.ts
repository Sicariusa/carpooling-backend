import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { BookingService } from './booking.service';
import { CreateBookingInput, UpdateBookingInput } from './booking.dto';
import { Booking } from './booking.schema';

@Resolver(() => Booking)
export class BookingResolver {
  constructor(private readonly bookingService: BookingService) {}

  @Query(() => [Booking])
  async bookings() {
    return this.bookingService.getAllBookings();
  }

  @Query(() => Booking)
  async booking(@Args('id') id: number) {
    return this.bookingService.getBookingById(id);
  }

  @Mutation(() => Booking)
  async createBooking(@Args('data') data: CreateBookingInput) {
    return this.bookingService.createBooking(data);
  }

  @Mutation(() => Booking)
  async updateBooking(@Args('data') data: UpdateBookingInput) {
    return this.bookingService.updateBooking(data.id, data);
  }

  @Mutation(() => Booking)
  async deleteBooking(@Args('id') id: number) {
    return this.bookingService.deleteBooking(id);
  }
}