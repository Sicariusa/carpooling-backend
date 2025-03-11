import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Booking {
  @Field(() => Int)
  id: number;

  @Field(() => Int)
  rideId: number;

  @Field(() => Int)
  passengerId: number;

  @Field()
  status: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}