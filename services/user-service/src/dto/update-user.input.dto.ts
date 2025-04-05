import { InputType, Field, Int } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsInt, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsEmail()
  @IsOptional()
  email?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  universityId?: number;

  @Field({ nullable: true })
  @MinLength(6)
  @IsOptional()
  password?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  role?: Role;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  phoneNumber?: number;
}
