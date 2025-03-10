import * as dotenv from 'dotenv';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from 'prisma/prisma.service';  // Prisma for payments
import * as amqp from 'amqplib';  // Import amqplib for RabbitMQ
import { EmailService } from './email.service';  // Email service for sending emails
import { CancelPaymentResponse } from './cancel-payment.response.dto';

dotenv.config();  // Load environment variables from .env

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private channel;  // RabbitMQ channel

  constructor(
    private prisma: PrismaService,  // Payment DB service
    private emailService: EmailService  // Inject EmailService
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: null });
    this.connectToRabbitMQ();
  }

  // Connect to RabbitMQ
  private async connectToRabbitMQ() {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL);
      this.channel = await connection.createChannel();
      await this.channel.assertQueue('payment-status', { durable: false });
      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Error connecting to RabbitMQ:', error);
    }
  }

  // Send RabbitMQ message after payment is successful
  private async sendPaymentEvent(paymentId: string, status: string) {
    this.channel.sendToQueue('payment-status', Buffer.from(JSON.stringify({ paymentId, status })));
    console.log('Sent message:', { paymentId, status });
  }

  // Process the payment
  async processPayment(
    userId: string,
    rideId: string,
    amount: number,
    paymentMethod: string,  // 'cash' or 'card'
    paymentToken: string = '',  // Payment token (used instead of raw card details)
    email: string  // Accept email as a parameter
  ) {
    try {
      if (paymentMethod === 'cash') {
        // If payment is cash, store it directly in the database as 'COMPLETED'
        const payment = await this.prisma.payment.create({
          data: {
            userId,  // Store the userId in the payment record
            rideId,
            amount,
            status: 'COMPLETED',
            transactionId: 'N/A',  // No Stripe transaction for cash payments
          },
        });

        await this.sendPaymentEvent(payment.id, 'COMPLETED');

        // Send a confirmation email to the user
        await this.emailService.sendEmail(
          email,  // Use the email passed in the mutation
          'Payment Confirmation',
          `Your cash payment of $${amount} for ride ${rideId} is successful.`
        );

        return { success: true, message: 'Cash payment processed successfully' };

      } else if (paymentMethod === 'card' && paymentToken) {
        // If payment is card, use the token to create a PaymentMethod
        const paymentMethodObj = await this.stripe.paymentMethods.create({
          type: 'card',
          card: {
            token: paymentToken,  // Use the Stripe token to create a payment method
          },
        });

        // Now that we have a valid PaymentMethod, create a PaymentIntent using it
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: amount * 100,  // Convert dollars to cents
          currency: 'usd',
          payment_method: paymentMethodObj.id,  // Use the PaymentMethod ID
          automatic_payment_methods: {
            enabled: true,  // Automatically enables the most appropriate payment method
          },
        });

        // Save the payment in the database with a status of 'PENDING'
        const payment = await this.prisma.payment.create({
          data: {
            userId,  // Store the userId in the payment record
            rideId,
            amount,
            status: 'PENDING',
            transactionId: paymentIntent.id,
          },
        });

        await this.sendPaymentEvent(payment.id, 'PENDING');

        // Send a confirmation email to the user
        await this.emailService.sendEmail(
          email,  // Use the email passed in the mutation
          'Payment Confirmation',
          `Your payment of $${amount} for ride ${rideId} is being processed.`
        );

        return { success: true, clientSecret: paymentIntent.client_secret };
      } else {
        throw new Error('Invalid payment method or missing payment token');
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Refund Payment Functionality (Admin only)
  async refundPayment(paymentId: string, email: string) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment || payment.status !== 'COMPLETED') {
        throw new Error('Refund can only be processed for completed payments.');
      }

      // Create the refund via Stripe
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.transactionId,
      });

      // Update the payment status to 'REFUNDED' in the database
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'REFUNDED' },
      });

      // Send RabbitMQ event after payment is refunded
      await this.sendPaymentEvent(paymentId, 'REFUNDED');

      // Send a refund confirmation email to the user
      await this.emailService.sendEmail(
        email,  // Send the email to the user's email (use email passed from mutation)
        'Refund Confirmation',
        `Your payment for ride ${payment.rideId} has been refunded.`
      );

      return { success: true, refundId: refund.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Cancel Payment (If not confirmed)
  async cancelPayment(paymentId: string) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });
  
      if (!payment) {
        return { success: false, message: 'Payment not found' };
      }
  
      if (payment.status === 'PENDING') {
        if (payment.transactionId) {
          await this.stripe.paymentIntents.cancel(payment.transactionId);
        }
  
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'FAILED' },
        });
  
        await this.sendPaymentEvent(paymentId, 'CANCELED');
  
        return { success: true, message: 'Payment successfully canceled' };
      } else {
        return { success: false, message: 'Payment cannot be canceled, it is not in PENDING state' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  
}
