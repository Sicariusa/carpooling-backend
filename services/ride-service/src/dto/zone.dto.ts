import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

@InputType()
export class CreateZoneInput {
  @Field()
  @IsString()
  name: string;

  @Field()
  @IsString()
  description: string;

  @Field(() => Int)
  @IsNumber()
  @Min(0)
  distanceFromGIU: number;
}

@InputType()
export class UpdateZoneInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @IsOptional()
  @Min(0)
  distanceFromGIU?: number;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
