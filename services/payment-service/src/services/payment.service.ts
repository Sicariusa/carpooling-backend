import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StripeConfigService } from '../config/stripe.config';
import { BookingService } from './booking.service';
import { 
  CreatePaymentInput, 
  ProcessPaymentInput, 
  PaymentStatus, 
  PaymentIntent,
  PaymentResult
} from '../dto/payment.dto';
import Stripe from 'stripe';
import { Payment } from '@prisma/client';

const logger = new Logger('PaymentService');

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeConfig: StripeConfigService,
    private readonly bookingService: BookingService,
  ) {
    this.stripe = this.stripeConfig.getStripe();
  }

  async createPayment(input: CreatePaymentInput, userId: string): Promise<PaymentIntent> {
    try {
      // Check if the booking exists
      const booking = await this.bookingService.getBookingById(input.bookingId);
      if (!booking) {
        throw new NotFoundException(`Booking with ID ${input.bookingId} not found`);
      }

      // Check if there's already a payment for this booking
      const existingPayment = await this.prisma.payment.findUnique({
        where: { bookingId: input.bookingId },
      });

      if (existingPayment) {
        if (existingPayment.status === PaymentStatus.COMPLETED) {
          throw new BadRequestException('Payment already completed for this booking');
        }

        // If we have a payment intent, reuse it
        if (existingPayment.stripeIntentId) {
          const intent = await this.stripe.paymentIntents.retrieve(existingPayment.stripeIntentId);
          return {
            clientSecret: intent.client_secret || '',
            id: existingPayment.id,
          };
        }

        // If payment exists but not completed, override it with new details
        // This could be improved to handle each state differently
        await this.prisma.payment.delete({
          where: { id: existingPayment.id },
        });
      }

      // Create a Stripe PaymentIntent
      const amountInCents = Math.round(input.amount * 100);
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: input.currency || 'USD',
        metadata: {
          bookingId: input.bookingId,
          userId,
        },
      });

      // Create a payment record in our database
      const payment = await this.prisma.payment.create({
        data: {
          bookingId: input.bookingId,
          amount: input.amount,
          currency: input.currency || 'USD',
          status: PaymentStatus.PENDING,
          stripeIntentId: paymentIntent.id,
          metadata: {
            userId,
            bookingDetails: booking,
          },
        },
      });

      logger.log(`Created payment intent ${paymentIntent.id} for booking ${input.bookingId}`);

      return {
        clientSecret: paymentIntent.client_secret || '',
        id: payment.id,
      };
    } catch (error) {
      logger.error(`Failed to create payment: ${error.message}`);
      throw error;
    }
  }

  async processPayment(input: ProcessPaymentInput): Promise<PaymentResult> {
    try {
      // Find the payment in our database
      const payment = await this.prisma.payment.findUnique({
        where: { id: input.paymentId },
      });

      if (!payment) {
        throw new NotFoundException(`Payment with ID ${input.paymentId} not found`);
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        return {
          success: true,
          message: 'Payment already completed',
          paymentId: payment.id,
          status: PaymentStatus.COMPLETED,
        };
      }

      // Update the payment with the payment method ID
      await this.prisma.payment.update({
        where: { id: input.paymentId },
        data: {
          status: PaymentStatus.PROCESSING,
          paymentMethod: input.paymentMethodId,
        },
      });

      // Process the payment with Stripe
      if (payment.stripeIntentId) {
        await this.stripe.paymentIntents.confirm(payment.stripeIntentId, {
          payment_method: input.paymentMethodId,
        });
      } else {
        throw new BadRequestException('Payment intent ID not found');
      }

      // Update the payment status to completed
      const updatedPayment = await this.prisma.payment.update({
        where: { id: input.paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          stripePaymentId: input.paymentMethodId,
        },
      });

      // Notify the booking service about the successful payment
      try {
        await this.bookingService.updateBookingAfterPayment(payment.bookingId, 'COMPLETED');
        logger.log(`Booking service notified about payment success for booking: ${payment.bookingId}`);
      } catch (notificationError) {
        logger.error(`Failed to notify booking service: ${notificationError.message}`);
        // Continue with the payment process even if notification fails
      }

      logger.log(`Payment ${input.paymentId} completed successfully`);

      return {
        success: true,
        message: 'Payment processed successfully',
        paymentId: updatedPayment.id,
        status: PaymentStatus.COMPLETED,
      };
    } catch (error) {
      logger.error(`Failed to process payment: ${error.message}`);
      
      const payment = await this.prisma.payment.findUnique({
        where: { id: input.paymentId },
      });
      
      // Update payment status to failed
      await this.prisma.payment.update({
        where: { id: input.paymentId },
        data: {
          status: PaymentStatus.FAILED,
        },
      });
      
      // Notify the booking service about the failed payment
      if (payment) {
        try {
          await this.bookingService.updateBookingAfterPayment(payment.bookingId, 'FAILED');
          logger.log(`Booking service notified about payment failure for booking: ${payment.bookingId}`);
        } catch (notificationError) {
          logger.error(`Failed to notify booking service about payment failure: ${notificationError.message}`);
        }
      }

      return {
        success: false,
        message: `Payment failed: ${error.message}`,
        paymentId: input.paymentId,
        status: PaymentStatus.FAILED,
      };
    }
  }

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async getPaymentByBookingId(bookingId: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment for booking ${bookingId} not found`);
    }

    return payment;
  }

  async cancelPayment(paymentId: string): Promise<PaymentResult> {
    try {
      const payment = await this.getPaymentById(paymentId);

      if (payment.status === PaymentStatus.CANCELLED) {
        return {
          success: true,
          message: 'Payment already cancelled',
          paymentId: payment.id,
          status: PaymentStatus.CANCELLED,
        };
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        // Process refund if payment was completed
        if (payment.stripePaymentId && payment.stripeIntentId) {
          await this.stripe.refunds.create({
            payment_intent: payment.stripeIntentId,
          });
        }

        await this.prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: PaymentStatus.REFUNDED,
          },
        });

        return {
          success: true,
          message: 'Payment refunded successfully',
          paymentId: payment.id,
          status: PaymentStatus.REFUNDED,
        };
      }

      // Cancel the payment intent if it exists
      if (payment.stripeIntentId) {
        await this.stripe.paymentIntents.cancel(payment.stripeIntentId);
      }

      // Update payment status to cancelled
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.CANCELLED,
        },
      });

      // Notify the booking service about the cancellation
      try {
        await this.bookingService.updateBookingAfterPayment(payment.bookingId, 'CANCELLED');
        logger.log(`Booking service notified about payment cancellation for booking: ${payment.bookingId}`);
      } catch (notificationError) {
        logger.error(`Failed to notify booking service about cancellation: ${notificationError.message}`);
      }

      return {
        success: true,
        message: 'Payment cancelled successfully',
        paymentId: updatedPayment.id,
        status: PaymentStatus.CANCELLED,
      };
    } catch (error) {
      logger.error(`Failed to cancel payment: ${error.message}`);
      throw error;
    }
  }

  // Webhook handler for Stripe events
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // Find the payment by Stripe intent ID
      const payment = await this.prisma.payment.findUnique({
        where: { stripeIntentId: paymentIntent.id },
      });

      if (!payment) {
        logger.error(`Payment not found for intent ${paymentIntent.id}`);
        return;
      }

      // Update payment status if not already completed
      if (payment.status !== PaymentStatus.COMPLETED) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
          },
        });

        // Notify the booking service about the successful payment
        try {
          await this.bookingService.updateBookingAfterPayment(payment.bookingId, 'COMPLETED');
          logger.log(`Booking service notified about webhook payment success for booking: ${payment.bookingId}`);
        } catch (notificationError) {
          logger.error(`Failed to notify booking service from webhook: ${notificationError.message}`);
        }
      }

      logger.log(`Payment ${payment.id} marked as complete from webhook`);
    } catch (error) {
      logger.error(`Failed to process payment success webhook: ${error.message}`);
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      // Find the payment by Stripe intent ID
      const payment = await this.prisma.payment.findUnique({
        where: { stripeIntentId: paymentIntent.id },
      });

      if (!payment) {
        logger.error(`Payment not found for failed intent ${paymentIntent.id}`);
        return;
      }

      // Update payment status to failed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      // Notify the booking service about the failed payment
      try {
        await this.bookingService.updateBookingAfterPayment(payment.bookingId, 'FAILED');
        logger.log(`Booking service notified about webhook payment failure for booking: ${payment.bookingId}`);
      } catch (notificationError) {
        logger.error(`Failed to notify booking service about payment failure from webhook: ${notificationError.message}`);
      }

      logger.log(`Payment ${payment.id} marked as failed from webhook`);
    } catch (error) {
      logger.error(`Failed to process payment failure webhook: ${error.message}`);
    }
  }
} 