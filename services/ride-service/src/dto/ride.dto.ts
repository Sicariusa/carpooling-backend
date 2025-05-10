import { InputType, Field, Int, Float, ID, registerEnumType } from '@nestjs/graphql';
import { IsDate, IsString, IsNumber, IsBoolean, IsOptional, Min, Max, IsEnum, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RideStatus } from '../schemas/ride.schema';

@InputType()
export class RideStopInput {
  @Field(() => ID)
  @IsString()
  stopId: string;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  sequence: number;
}

@InputType()
export class CreateRideInput {
  @Field(() => Float)
  @IsNumber()
  driverLatitude: number;

  @Field(() => Float)
  @IsNumber()
  driverLongitude: number;

  @Field(() => ID)
  @IsString()
  selectedRouteId: string;

  @Field(() => Boolean)
  @IsBoolean()
  startFromGIU: boolean;

  @Field()
  @IsDate()
  @Type(() => Date)
  departureTime: Date;

  @Field(() => Int)
  @IsNumber()
  @Min(1)
  totalSeats: number;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  availableSeats: number;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  pricePerSeat: number;

  @Field(() => Float, { defaultValue: 1 })
  @IsNumber()
  @Min(1)
  priceScale: number;

  @Field(() => Boolean, { defaultValue: false })
  @IsBoolean()
  girlsOnly: boolean;
}

@InputType()
export class UpdateRideInput {
  @Field(() => [RideStopInput], { nullable: true })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => RideStopInput)
  @IsOptional()
  stops?: RideStopInput[];

  @Field(() => Date, { nullable: true })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  departureTime?: Date;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @IsOptional()
  @Min(1)
  totalSeats?: number;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @IsOptional()
  @Min(0)
  availableSeats?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsOptional()
  @Min(0)
  pricePerSeat?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsOptional()
  @Min(1)
  priceScale?: number;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  girlsOnly?: boolean;

  @Field(() => RideStatus, { nullable: true })
  @IsEnum(RideStatus)
  @IsOptional()
  status?: RideStatus;
}

@InputType()
export class SearchRideInput {
  @Field(() => ID, { nullable: true })
  @IsString()
  @IsOptional()
  fromZoneId?: string;

  @Field(() => ID, { nullable: true })
  @IsString()
  @IsOptional()
  toZoneId?: string;

  @Field({ nullable: true })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  departureDate?: Date;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  girlsOnly?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  minAvailableSeats?: number = 1;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxPrice?: number;
}

@InputType()
export class BookingDeadlineInput {
  @Field(() => ID)
  @IsString()
  rideId: string;

  @Field(() => Int, { description: 'Minutes before departure to set as booking deadline' })
  @IsNumber()
  @Min(30)
  @Max(1440) // Max 24 hours
  minutesBeforeDeparture: number;
}

@InputType()
export class ModifyDestinationInput {
  @Field(() => ID)
  @IsString()
  bookingId: string;
  
  @Field(() => ID)
  @IsString()
  rideId: string;
  
  @Field()
  @IsString()
  newDropoffLocation: string;
}
