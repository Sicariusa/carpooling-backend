import { Controller, Post, Req, Res, Headers, Get, Param } from '@nestjs/common';
import Stripe from 'stripe';
import { Response } from 'express';
import { PaymentService } from '../payment/payment.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Controller('webhook')
export class WebhookController {
  prisma: any;

  constructor(
    private paymentService: PaymentService,
    private config: ConfigService,
  ) {}

  @Post()
  async handleWebhook(
    @Req() req: { rawBody: Buffer },
    @Res() res: Response,
    @Headers('stripe-signature') sig: string,
  ) {
    console.log('Webhook received - rawBody length:', req.rawBody?.length);

    if (!sig) {
      console.error('Stripe signature missing');
      return res.status(400).send('Stripe signature missing');
    }

    const stripe = new Stripe(this.config.getOrThrow('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-03-31.basil',
    });

    try {
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        this.config.getOrThrow('STRIPE_WEBHOOK_SECRET')
      );

      console.log('Full event received:', JSON.stringify(event, null, 2));

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const intent = event.data.object as Stripe.PaymentIntent;
          console.log('✅ PaymentIntent succeeded:', intent.id);
          await this.paymentService.handlePaymentIntentSucceeded(intent.id);
          const bookingId = intent.metadata?.bookingId;
          console.log('📦 Booking ID from metadata:', bookingId);


if (bookingId) {
  try {
    console.log('📡 Sending confirmBooking mutation to Booking Service...');

    await axios.post('http://localhost:3001/graphql', {
      query: `
        mutation {
          internalConfirmBooking(id: "${bookingId}") {
            id
            status
          }
        }
      `
    }, {
      headers: {
        Authorization: `Bearer ${intent.metadata.userToken || ''}`, // optional if protected
        'Content-Type': 'application/json',
      }
    });
    console.log('✅ Booking confirmed from webhook for bookingId:', bookingId);
  } catch (err) {
    console.error('❌ Failed to confirm booking:', err.response?.data || err.message);
  }
}

          break;
        }

        case 'charge.succeeded': {
          const charge = event.data.object as Stripe.Charge;
          const intentId = typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent.id;
          console.log('✅ Charge succeeded for PaymentIntent:', intentId);
          await this.paymentService.handlePaymentIntentSucceeded(intentId);
          break;
        }

        case 'payment_intent.created': {
          console.log('🆕 PaymentIntent created');
          await this.paymentService.handlePaymentIntentCreated(event);
          break;
        }

        case 'payment_intent.payment_failed': {
          console.log('❌ Payment failed');
          await this.paymentService.handlePaymentIntentFailed(event);
          break;
        }
        case 'charge.updated':
  await this.paymentService.handleChargeUpdated(event);
  break;


        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return res.json({ received: true });
    } catch (err) {
      console.error('Webhook processing error:', err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  @Get('debug/:paymentIntentId')
  async debugPayment(@Param('paymentIntentId') paymentIntentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { paymentIntentId }
    });

    return {
      exists: !!payment,
      currentStatus: payment?.status,
      payment
    };
  }

  
}
