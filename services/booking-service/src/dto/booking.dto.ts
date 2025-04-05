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
  @Field(() => ID, { nullable: true }) // <-- THIS is the fix
  @IsOptional()
  @IsString()
  userId?: string;
  

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
