import { ObjectType, Field, Float } from "@nestjs/graphql";

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

  @Field()
  seatsAvailable: number;  

  @Field(() => Float)
  price: number;

  @Field()
  isGirlsOnly: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
