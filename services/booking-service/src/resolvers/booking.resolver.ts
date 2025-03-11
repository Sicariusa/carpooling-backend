import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { CreateBookingInput, UpdateBookingInput } from '../dto/booking.dto';
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

  @Mutation(() => Booking)
  async createBooking(@Args('data') data: CreateBookingInput) {
    return this.bookingService.createBooking(data);
  }

  @Mutation(() => Booking)
  async updateBooking(@Args('data') data: UpdateBookingInput) {
    return this.bookingService.updateBooking(data.id, data);
  }

  @Mutation(() => Booking)
  async deleteBooking(@Args('id', { type: () => ID }) id: string) {
    return this.bookingService.deleteBooking(id);
  }
}