import { Field, InputType, ID } from '@nestjs/graphql';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

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

  @Field()
  @IsNotEmpty()
  @IsString()
  pickupLocation: string; // The pickup location (required)

  @Field()
  @IsNotEmpty()
  @IsString()
  dropoffLocation: string; // The dropoff location (required)

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  status?: string; // The status of the booking (optional)
}

@InputType()
export class UpdateBookingInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  id: string; // The ID of the booking to be updated (required)

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  status?: string; // The new status of the booking (optional)

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  pickupLocation?: string; // The pickup location (optional)

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  dropoffLocation?: string; // The dropoff location (optional)
}
