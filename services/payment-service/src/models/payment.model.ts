import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { PaymentStatus } from '../dto/payment.dto';
import { GraphQLScalarType } from 'graphql';

// Register enum for GraphQL
registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
});

// Create a custom scalar for JSON objects
export const GraphQLJSON = new GraphQLScalarType({
  name: 'JSONObject',
  description: 'JSON object custom scalar type',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast: any) => ast.value,
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

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, any>;
} 