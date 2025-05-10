import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsArray, IsOptional, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateRouteInput {
  @Field()
  @IsString()
  name: string;

  @Field(() => ID)
  @IsString()
  zoneId: string;

  @Field(() => [ID])
  @IsArray()
  @ArrayMinSize(2)
  stopIds: string[];
}

@InputType()
export class UpdateRouteInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field(() => ID, { nullable: true })
  @IsString()
  @IsOptional()
  zoneId?: string;

  @Field(() => [ID], { nullable: true })
  @IsArray()
  @ArrayMinSize(2)
  @IsOptional()
  stopIds?: string[];
} 