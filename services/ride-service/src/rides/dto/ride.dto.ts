import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsInt, IsBoolean, IsDate } from 'class-validator';

@InputType()
export class CreateRideInput {
  @Field()
  @IsString()
  driverId: string;

  @Field()
  @IsString()
  origin: string;

  @Field()
  @IsString()
  destination: string;

  @Field()
  @IsDate()
  departure: Date;

  @Field()
  @IsInt()
  seatsAvailable: number;

  @Field()
  @IsInt()
  price: number;

  @Field()
  @IsBoolean()
  isGirlsOnly: boolean;
}

@InputType()
export class UpdateRideInput {
  @Field({ nullable: true })
  @IsString()
  origin?: string;

  @Field({ nullable: true })
  @IsString()
  destination?: string;

  @Field({ nullable: true })
  @IsDate()
  departure?: Date;

  @Field({ nullable: true })
  @IsInt()
  seatsAvailable?: number;

  @Field({ nullable: true })
  @IsInt()
  price?: number;

  @Field({ nullable: true })
  @IsBoolean()
  isGirlsOnly?: boolean;
}
