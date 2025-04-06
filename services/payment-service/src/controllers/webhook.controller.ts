import { Controller, Post, Body, Headers, BadRequestException, Req, HttpCode, Param, Get } from '@nestjs/common';
import { PaymentService } from '../services/payment.service';
import { StripeConfigService } from '../config/stripe.config';
import { Request } from 'express';
import Stripe from 'stripe';

@Controller('webhooks')
export class WebhookController {
  private readonly stripe: Stripe;

  constructor(
    private readonly paymentService: PaymentService,
    private readonly stripeConfig: StripeConfigService,
  ) {
    this.stripe = this.stripeConfig.getStripe();
  }

  @Post('stripe')
  @HttpCode(200)
  async handleStripeWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature: string,
    @Req() request: Request,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header');
    }

    try {
      // Verify the webhook signature
      const event = this.stripe.webhooks.constructEvent(
        request.body, // raw body
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || '',
      );

      // Process the webhook event
      await this.paymentService.handleStripeWebhook(event);

      return { received: true };
    } catch (err) {
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }

  // Test endpoint for simulating payment events without Stripe (FOR TESTING ONLY)
  @Get('test-payment-success/:bookingId')
  async testPaymentSuccess(@Param('bookingId') bookingId: string) {
    try {
      // First check if a payment exists for this booking
      let payment;
      try {
        payment = await this.paymentService.getPaymentByBookingId(bookingId);
      } catch (e) {
        // Create a test payment if one doesn't exist
        payment = await this.stripe.paymentIntents.create({
          amount: 2000, // $20.00
          currency: 'usd',
          metadata: {
            bookingId,
          },
        });
      }

      // Call the booking service to handle payment success
      const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'http://localhost:3001';
      const response = await fetch(`${bookingServiceUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            mutation UpdateBookingAfterPayment($bookingId: ID!, $status: String!) {
              updateBookingAfterPayment(bookingId: $bookingId, status: $status) {
                id
                status
              }
            }
          `,
          variables: {
            bookingId,
            status: 'COMPLETED'
          }
        }),
      });

      const result = await response.json();
      return {
        success: true,
        message: 'Payment test success event sent to booking service',
        bookingId,
        response: result
      };
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error.message}`,
        bookingId
      };
    }
  }
} 