import { InputType, Field, Int } from '@nestjs/graphql';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Field(() => Int)
  @IsInt()
  @IsNotEmpty()
  universityId: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @Field(() => String, { defaultValue: Role.PASSENGER })
  @IsOptional()
  role?: Role;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  phoneNumber?: number;
}
