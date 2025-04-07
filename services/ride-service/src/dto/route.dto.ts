import { InputType, Field, Float, ID, Int } from '@nestjs/graphql';
import { IsString, IsNumber, IsBoolean, IsOptional, ValidateNested, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateRouteStopInput {
  @Field(() => ID)
  @IsString()
  stopId: string;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @IsOptional()
  sequence?: number;
}

@InputType()
export class CreateRouteInput {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsString()
  description: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  totalDistance: number;

  @Field(() => [CreateRouteStopInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRouteStopInput)
  stops: CreateRouteStopInput[];
}

@InputType()
export class UpdateRouteInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsOptional()
  @Min(0)
  totalDistance?: number;

  @Field(() => [CreateRouteStopInput], { nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRouteStopInput)
  @IsOptional()
  stops?: CreateRouteStopInput[];

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
