import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
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

  @Field()
  password?: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => String) // Note: Role enum is represented as String in GraphQL
  role: Role;

  @Field(() => Int, { nullable: true })
  phoneNumber?: number;

  @Field({ nullable: true }) // Add gender as a nullable field
  gender?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
