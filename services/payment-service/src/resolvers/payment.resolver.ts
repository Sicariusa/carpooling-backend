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
    // This endpoint uses Stripe test tokens based on the card number provided
    // For security reasons, raw card details aren't sent directly to Stripe
    // We determine which test token to use based on the first digits of the card number:
    // - '4' prefix uses 'pm_card_visa'
    // - '5' prefix uses 'pm_card_mastercard'
    // - '34' or '37' prefix uses 'pm_card_amex'
    // - '6' prefix uses 'pm_card_discover'
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