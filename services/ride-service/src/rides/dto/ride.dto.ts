import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateRideInput {
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

  @Field()
  price: number;
}

@InputType()
export class UpdateRideInput {
  @Field({ nullable: true })
  origin?: string;

  @Field({ nullable: true })
  destination?: string;

  @Field({ nullable: true })
  departure?: Date;

  @Field({ nullable: true })
  seatsAvailable?: number;

  @Field({ nullable: true })
  price?: number;
}