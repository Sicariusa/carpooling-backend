import { InputType, Field, Int, registerEnumType } from '@nestjs/graphql';
import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

// Register the Role enum with GraphQL
registerEnumType(Role, {
  name: 'Role',
  description: 'User role',
});

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

  @Field()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @Field(() => Role, { defaultValue: Role.PASSENGER })
  @IsNotEmpty()
  role: Role;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  phoneNumber?: number;
}
