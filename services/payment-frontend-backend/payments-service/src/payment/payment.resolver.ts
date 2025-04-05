import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { PaymentService } from './payment.service';
import { PaymentResponse } from './payment-response.dto';
import { CancelPaymentResponse } from './cancel-payment.response.dto';
import { PaymentObject } from './payment.model'; // ✅ your new DTO

@Resolver()
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}


  @Query(() => [PaymentObject])
  async getPaymentsForUser(@Args('userId') userId: string): Promise<PaymentObject[]> {
    return this.paymentService.getPaymentsByUser(userId); // ✅ use the service
  }

  
  
  // Mutation for making a payment
  @Mutation(() => PaymentResponse)  // Updated return type to PaymentResponse
  async makePayment(
    @Args('userId') userId: string,
    @Args('rideId') rideId: string,
    @Args('amount') amount: number,
    @Args('paymentMethod') paymentMethod: string,  // 'cash' or 'card'
    @Args('paymentToken', { nullable: true }) paymentToken: string,  // Optional for card payments
    @Args('email') email: string  // Email for sending confirmation
  ): Promise<PaymentResponse> {
    const result = await this.paymentService.processPayment(
      userId,
      rideId,
      amount,
      paymentMethod,
      paymentToken,
      email // Pass the email argument
    );

    if (!result.success) throw new Error(result.error);

    return { clientSecret: result.clientSecret, message: result.message };  // Return as an object
  }
  @Mutation(() => String)
  async confirmCardPayment(@Args('paymentId') paymentId: string) {
    await this.paymentService.markPaymentAsCompleted(paymentId);
    return `Payment ${paymentId} marked as COMPLETED.`;
  }
  
  // Mutation for refunding a payment (Admin)
  @Mutation(() => String)
  async refundPayment(
    @Args('paymentId') paymentId: string,  // Pass the paymentId
    @Args('email') email: string  // Pass the email as well
  ) {
    const result = await this.paymentService.refundPayment(paymentId, email);  // Pass email along with paymentId
    if (!result.success) throw new Error(result.error);
    return `Refund successful: ${result.refundId}`;
  }

  // Mutation for canceling a payment
  @Mutation(() => CancelPaymentResponse)
  async cancelPayment(
    @Args('paymentId') paymentId: string
  ): Promise<CancelPaymentResponse> {
    const result = await this.paymentService.cancelPayment(paymentId);
    return { success: result.success, message: result.message };
  }
}

