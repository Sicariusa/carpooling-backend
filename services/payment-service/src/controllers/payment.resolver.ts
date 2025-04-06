import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { PaymentService } from '../services/payment.service';
import { Payment } from '../models/payment.model';
import { 
  CreatePaymentInput, 
  ProcessPaymentInput, 
  PaymentIntent,
  PaymentResult
} from '../dto/payment.dto';
import { UseGuards } from '@nestjs/common';

@Resolver(() => Payment)
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}

  @Query(() => Payment)
  async getPayment(@Args('id') id: string) {
    return this.paymentService.getPaymentById(id);
  }

  @Query(() => Payment)
  async getPaymentByBookingId(@Args('bookingId') bookingId: string) {
    return this.paymentService.getPaymentByBookingId(bookingId);
  }

  @Mutation(() => PaymentIntent)
  async createPayment(
    @Args('input') input: CreatePaymentInput,
    @Context() context: any,
  ) {
    // In a real application, you would extract the userId from an auth token
    // This is a simplified example
    const userId = context.req?.user?.id || 'user-123';
    return this.paymentService.createPayment(input, userId);
  }

  @Mutation(() => PaymentResult)
  async processPayment(@Args('input') input: ProcessPaymentInput) {
    return this.paymentService.processPayment(input);
  }

  @Mutation(() => PaymentResult)
  async cancelPayment(@Args('paymentId') paymentId: string) {
    return this.paymentService.cancelPayment(paymentId);
  }
} 