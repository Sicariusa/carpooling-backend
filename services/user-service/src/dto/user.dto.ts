import { Field, ID, ObjectType, InputType, Int, registerEnumType } from '@nestjs/graphql';
import { Role } from '@prisma/client';

// Register the Role enum with GraphQL
registerEnumType(Role, {
  name: 'Role',
  description: 'User roles',
});

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field(() => Int)
  universityId: number;

  @Field(() => Role)
  role: Role;

  @Field(() => Int, { nullable: true })
  phoneNumber?: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@InputType()
export class CreateUserInput {
  @Field()
  email: string;

  @Field(() => Int)
  universityId: number;

  @Field()
  password: string;

  @Field(() => Role, { defaultValue: Role.PASSENGER })
  role?: Role;

  @Field(() => Int, { nullable: true })
  phoneNumber?: number;
}

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  email?: string;

  @Field(() => Int, { nullable: true })
  universityId?: number;

  @Field({ nullable: true })
  password?: string;

  @Field(() => Role, { nullable: true })
  role?: Role;

  @Field(() => Int, { nullable: true })
  phoneNumber?: number;
} 