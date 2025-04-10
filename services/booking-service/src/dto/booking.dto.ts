import { Field, InputType, ID, registerEnumType, Float } from '@nestjs/graphql';
import { IsString, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

registerEnumType(BookingStatus, {
  name: 'BookingStatus',
  description: 'Status of a booking',
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

  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  pickupStopId: string; // The ID of the pickup stop

  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  dropoffStopId: string; // The ID of the dropoff stop

  @Field(() => BookingStatus, { nullable: true })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus; // The status of the booking (optional)
}
