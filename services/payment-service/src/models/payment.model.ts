import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { PaymentStatus } from '../dto/payment.dto';

// Register enum for GraphQL
registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
});

@ObjectType()
export class Payment {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  bookingId: string;

  @Field()
  amount: number;

  @Field()
  currency: string;

  @Field({ nullable: true })
  stripePaymentId?: string;

  @Field({ nullable: true })
  stripeIntentId?: string;

  @Field({ nullable: true })
  paymentMethod?: string;

  @Field(() => PaymentStatus)
  status: PaymentStatus;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => JSON, { nullable: true })
  metadata?: Record<string, any>;
} 