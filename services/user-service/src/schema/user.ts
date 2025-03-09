import { ObjectType, Field, ID, Int } from '@nestjs/graphql';
import { Role } from '@prisma/client';

@ObjectType()
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field(() => Int, { nullable: true }) // ✅ Ensure university_id is a number
  university_id: number;


  @Field()
  role: Role;

  @Field({ nullable: true })
  phoneNumber?: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

