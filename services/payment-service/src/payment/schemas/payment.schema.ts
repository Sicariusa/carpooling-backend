import { ObjectType, Field, Int, ID } from '@nestjs/graphql';

@ObjectType()
export class Payment {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  bookingId: string;

  @Field(() => Int)
  amount: number;

  @Field()
  currency: string;

  @Field()
  status: string;

  @Field({ nullable: true })
  paymentIntentId?: string;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
clientSecret?: string;

}
