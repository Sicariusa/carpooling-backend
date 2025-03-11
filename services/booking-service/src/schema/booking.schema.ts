import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType()
export class Booking {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  passengerId: string;

  @Field(() => ID, { nullable: true })
  rideId?: string;

  @Field()
  status: string;

  @Field()
  pickupLocation: string;

  @Field()
  dropoffLocation: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}