import { Field, InputType, ID, registerEnumType, ObjectType } from '@nestjs/graphql';
import { IsString, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';
import { Booking } from '../schema/booking.schema';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export enum PaymentType {
  CASH = 'CASH',
  CREDIT = 'CREDIT'
}

registerEnumType(BookingStatus, {
  name: 'BookingStatus',
  description: 'Status of a booking',
});

registerEnumType(PaymentType, {
  name: 'PaymentType',
  description: 'Type of payment for booking',
});

@InputType()
export class CreateBookingInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  userId?: string; // The ID of the user (will be set from context)

  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  rideId: string; // The ID of the ride being booked

  @Field()
  @IsNotEmpty()
  @IsString()
  pickupLocation: string; // The pickup location (required)

  @Field()
  @IsNotEmpty()
  @IsString()
  dropoffLocation: string; // The dropoff location (required)

  @Field(() => PaymentType)
  @IsNotEmpty()
  @IsEnum(PaymentType)
  paymentType: PaymentType; // The payment method (CASH or CREDIT)

  @Field(() => BookingStatus, { nullable: true })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus; // The status of the booking (optional)
}

@ObjectType()
export class BookingWithPaymentInfo {
  @Field(() => ID)
  id: string;
  
  @Field(() => ID)
  userId: string;
  
  @Field(() => Booking)
  booking: Booking;

  @Field({ nullable: true })
  paymentRequired?: boolean;

  @Field({ nullable: true })
  paymentUrl?: string;

  @Field(() => ID)
  rideId: string;
  
  @Field(() => BookingStatus)
  status: BookingStatus;
  
  @Field()
  pickupLocation: string;
  
  @Field()
  dropoffLocation: string;

  //createdAt
  @Field()
  createdAt: Date;

  //updatedAt
  @Field()
  updatedAt: Date;
}
