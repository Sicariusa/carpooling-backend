import { Field, InputType, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { IsString, IsNumber, IsOptional, IsNotEmpty, IsEnum } from 'class-validator';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED'
}

registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
  description: 'Status of a payment',
});

@InputType()
export class CreatePaymentInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @Field()
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  currency?: string = 'USD';

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

@InputType()
export class ProcessPaymentInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  paymentId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  paymentMethodId: string;
}

@ObjectType()
export class PaymentIntent {
  @Field()
  clientSecret: string;

  @Field()
  id: string;
}

@ObjectType()
export class PaymentResult {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => ID, { nullable: true })
  paymentId?: string;

  @Field(() => PaymentStatus, { nullable: true })
  status?: PaymentStatus;
} 