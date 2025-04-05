import { InputType, Field, Float, Int } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsNumber, IsDate, IsBoolean, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { RideStatus } from '../ride.model';

@InputType()
export class CreateRideInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  driverId?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  origin: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  destination: string;

  @Field({ nullable: true })  
  @IsOptional()
  @IsString()
  street?: string;

  @Field()
  @Type(() => Date)
  @IsDate()
  departure: Date;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  seatsAvailable: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  price: number;

  @Field({ defaultValue: false })
  @IsBoolean()
  isGirlsOnly: boolean;

  @Field({ defaultValue: false })
  @IsBoolean()
  isFromGIU: boolean;

  @Field({ defaultValue: false })
  @IsBoolean()
  isToGIU: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  bookingDeadline?: Date;
}

@InputType()
export class UpdateRideInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  origin?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  destination?: string;

  @Field({ nullable: true })  
  @IsOptional()
  @IsString()
  street?: string;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  departure?: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  seatsAvailable?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isGirlsOnly?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  status?: RideStatus;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  bookingDeadline?: Date;
}

@InputType()
export class SearchRideInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  origin?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  destination?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isFromGIU?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isToGIU?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isGirlsOnly?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  departureDate?: Date;

  @Field({ nullable: true })  
  @IsOptional()
  @IsString()
  street?: string;


}
