import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateBookingInput {
  @Field()
  rideId: number; // The ID of the ride (required)

  @Field()
  passengerId: number; // The ID of the passenger (required)

  @Field({ nullable: true })
  status?: string; // The status of the booking (optional)
}

@InputType()
export class UpdateBookingInput {
  @Field()
  id: number; // The ID of the booking to be updated (required)

  @Field({ nullable: true })
  status?: string; // The new status of the booking (optional)
}
