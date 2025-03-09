import { InputType, Field } from '@nestjs/graphql';
import { Role } from '@prisma/client';


@InputType()
export class CreateUserInput {
  @Field()
  email: string;

  @Field()
  universityId: number;

  @Field()
  password: string;

  @Field(() => Role, { defaultValue: Role.PASSENGER })
  role?: Role;

  @Field({ nullable: true })
  phoneNumber?: number;
}
