/* eslint-disable prettier/prettier */
import { ObjectType, Field, Float, Int, registerEnumType } from "@nestjs/graphql";

export enum RideStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

registerEnumType(RideStatus, {
  name: 'RideStatus',
  description: 'Status of a ride',
});

@ObjectType()
export class Ride {
  @Field()
  id: string;

  @Field()
  driverId: string;

  @Field()
  origin: string;

  @Field()
  destination: string;

  @Field()
  departure: Date;

  @Field(() => Int)
  seatsAvailable: number;

  @Field(() => Float)
  price: number;

  @Field()
  isGirlsOnly: boolean;

  @Field(() => RideStatus)
  status: RideStatus;

  @Field()
  isFromGIU: boolean;

  @Field()
  isToGIU: boolean;

  @Field({ nullable: true }) 
  street?: string;

  @Field({ nullable: true })
  bookingDeadline?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
