import { InputType, Field, Float, ID } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean } from 'class-validator';

@InputType()
export class CreateStopInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  address: string;

  @Field(() => Float)
  @IsNumber()
  latitude: number;

  @Field(() => Float)
  @IsNumber()
  longitude: number;

  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  zoneId: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class UpdateStopInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  address?: string;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @Field(() => ID, { nullable: true })
  @IsString()
  @IsOptional()
  zoneId?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
