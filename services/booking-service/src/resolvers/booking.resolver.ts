import { Resolver, Query, Mutation, Args, ID, Context, Field, ObjectType } from '@nestjs/graphql';
import { CreateBookingInput, BookingStatus, PaymentType, BookingWithPaymentInfo } from '../dto/booking.dto';
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

  @Mutation(() => BookingWithPaymentInfo)
  async BookRide(@Args('data') data: CreateBookingInput, @Context() context) {
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to book a ride');
    }
    
    if (!user.isApproved) {
      throw new UnauthorizedException('Your account needs to be approved before you can book rides');
    }
    
    // Admins and Drivers cannot book rides
    if(user.role === 'ADMIN' || user.role === 'DRIVER') {
      throw new UnauthorizedException('Admins and Drivers cannot book rides');
    }
    
    const booking = await this.bookingService.BookRide(data, user.id);
    
    // For CREDIT payment type, we need to redirect to payment
    if (data.paymentType === PaymentType.CREDIT) {
      return {
        id: booking.id,
        userId: booking.userId,
        rideId: booking.rideId,
        status: booking.status,
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        booking,
        paymentRequired: true,
        paymentUrl: `/payment/${booking.id}` // This URL would be handled by your frontend to show the payment form
      };
    }
    
    // For CASH payment, no additional action needed
    return {
      id: booking.id,
      userId: booking.userId,
      rideId: booking.rideId,
      status: booking.status,
      pickupLocation: booking.pickupLocation,
      dropoffLocation: booking.dropoffLocation,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      booking,
      paymentRequired: false
    };
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
    if(user.role !== 'DRIVER') {
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
    if(user.role !== 'DRIVER') {
      throw new UnauthorizedException('You are not authorized to reject bookings ONLY DRIVERS');
    }
    
    return this.bookingService.rejectBooking(id, user.id);
  }

  @Mutation(() => Booking)
  async updateBookingAfterPayment(
    @Args('bookingId', { type: () => ID }) bookingId: string,
    @Args('status') status: string
  ) {
    // This endpoint is intended to be called by the payment service
    // In a production app, you would add authentication or API key validation
    return this.bookingService.updateBookingAfterPayment(bookingId, status);
  }
}