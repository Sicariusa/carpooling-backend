import { Field, InputType, ID, registerEnumType } from '@nestjs/graphql';
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
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  userId: string; // The ID of the user (required)

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  passengerId?: string; // The ID of the passenger (optional, will default to userId)

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

  @Field(() => BookingStatus, { nullable: true })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus; // The status of the booking (optional)
}

@InputType()
export class UpdateBookingInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  id: string; // The ID of the booking to be updated (required)

  @Field(() => BookingStatus, { nullable: true })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus; // The new status of the booking (optional)

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  pickupLocation?: string; // The pickup location (optional)

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dropoffLocation?: string; // The dropoff location (optional)
}

@InputType()
export class BookingFilterInput {
  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  userId?: string; // Filter by user ID

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  rideId?: string; // Filter by ride ID

  @Field(() => BookingStatus, { nullable: true })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus; // Filter by status
}
