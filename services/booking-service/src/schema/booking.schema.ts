import { ObjectType, Field, Int, ID, registerEnumType } from '@nestjs/graphql';
import { BookingStatus, PaymentType } from '../dto/booking.dto';

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

  @Field(() => PaymentType)
  paymentType: PaymentType;

  @Field()
  pickupLocation: string;

  @Field()
  dropoffLocation: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}