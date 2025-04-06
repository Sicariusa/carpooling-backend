import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { PaymentService } from '../services/payment.service';
import { Payment } from '../models/payment.model';
import { 
  CreatePaymentInput, 
  ProcessPaymentInput, 
  PaymentIntent,
  PaymentResult
} from '../dto/payment.dto';
import { UnauthorizedException } from '@nestjs/common';

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
    @Context() context,
  ) {
    // In a real application, you would extract the userId from an auth token
    // This is a simplified example
    const user = context.req.user;
    if (!user) {
      throw new UnauthorizedException('You must be logged in to create a payment');
    }
    return this.paymentService.createPayment(input, user.id);
  }

  @Mutation(() => PaymentResult)
  async processPayment(@Args('input') input: ProcessPaymentInput) {
    // This endpoint processes payments and supports redirect-based payment flows
    // After processing, users will be redirected to the URL specified in PAYMENT_RETURN_URL env var
    // or the default carpooling-app.com/payment/complete URL
    // 
    // Payment method selection is based on the card number's first digits:
    // - Visa cards (4xxx): pm_card_visa
    // - Mastercard (5xxx): pm_card_mastercard
    // - Amex (34xx/37xx): pm_card_amex
    // - Discover (6xxx): pm_card_discover
    // 
    // Example usage:
    // mutation {
    //   processPayment(input: {
    //     paymentId: "payment-id-here"
    //     cardNumber: "4242424242424242"
    //     expMonth: 12
    //     expYear: 2025
    //     cvc: "123"
    //   }) {
    //     success
    //     message
    //     paymentId
    //     status
    //   }
    // }
    return this.paymentService.processPayment(input);
  }

  @Mutation(() => PaymentResult)
  async cancelPayment(@Args('paymentId') paymentId: string) {
    return this.paymentService.cancelPayment(paymentId);
  }
} 