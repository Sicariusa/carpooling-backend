import { ObjectType, Field, Int, ID, registerEnumType, Float } from '@nestjs/graphql';
import { BookingStatus } from '../dto/booking.dto';

@ObjectType()
export class Booking {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => ID)
  rideId: string;

  @Field(() => BookingStatus)
  status: BookingStatus;

  @Field(() => ID, { nullable: true })
  pickupStopId: string;

  @Field(() => ID, { nullable: true })
  dropoffStopId: string;

  @Field()
  pickupLocation: string;

  @Field()
  dropoffLocation: string;

  @Field(() => Float, { nullable: true })
  price: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}