// payment.model.ts
import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class PaymentObject {
  @Field()
  id: string;

  @Field()
  userId: string;

  @Field()
  rideId: string;

  @Field(() => Float)
  amount: number;

  @Field()
  status: string;

  @Field({ nullable: true })
  transactionId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
