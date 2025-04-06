import { Injectable, Logger, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
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
import { connectConsumer, startConsumer, produceMessage } from '../utils/kafka';

const logger = new Logger('PaymentService');

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeConfig: StripeConfigService,
    private readonly bookingService: BookingService,
  ) {
    this.stripe = this.stripeConfig.getStripe();
  }

  async onModuleInit() {
    try {
      await connectConsumer();
      await startConsumer(this);
      logger.log('Kafka consumer initialized for payment service');
    } catch (error) {
      logger.error(`Kafka consumer init failed: ${error.message}`);
    }
  }

  async createPaymentFromKafka(bookingId: string, userId: string, amount: number, currency: string): Promise<void> {
    try {
      logger.log(`Creating payment from Kafka request for booking ${bookingId}`);
      
      // Check if the booking exists
      const booking = await this.bookingService.getBookingById(bookingId);
      if (!booking) {
        throw new NotFoundException(`Booking with ID ${bookingId} not found`);
      }

      // Check if there's already a payment for this booking
      const existingPayment = await this.prisma.payment.findUnique({
        where: { bookingId },
      });

      if (existingPayment) {
        if (existingPayment.status === PaymentStatus.COMPLETED) {
          logger.log(`Payment already completed for booking ${bookingId}`);
          return;
        }

        // If payment exists but not completed, delete it to create a new one
        await this.prisma.payment.delete({
          where: { id: existingPayment.id },
        });
      }

      // Create a Stripe PaymentIntent
      const amountInCents = Math.round(amount * 100);
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency || 'USD',
        metadata: {
          bookingId,
          userId,
        },
      });

      // Create a payment record in our database
      const payment = await this.prisma.payment.create({
        data: {
          bookingId,
          amount,
          currency: currency || 'USD',
          status: PaymentStatus.PENDING,
          stripeIntentId: paymentIntent.id,
          metadata: {
            userId,
            bookingDetails: booking,
          },
        },
      });

      logger.log(`Created payment intent ${paymentIntent.id} for booking ${bookingId}`);
      
      // Send payment intent details back to the booking service
      await produceMessage('payment-events', {
        type: 'PAYMENT_INTENT_CREATED',
        bookingId,
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
      });
      
    } catch (error) {
      logger.error(`Failed to create payment from Kafka: ${error.message}`);
      
      // Notify the booking service about the failure
      await produceMessage('payment-events', {
        type: 'PAYMENT_INTENT_FAILED',
        bookingId,
        error: error.message,
      });
    }
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

      // Notify the booking service about the successful payment via Kafka
      await produceMessage('payment-events', {
        type: 'PAYMENT_COMPLETED',
        bookingId: payment.bookingId,
        paymentId: payment.id
      });
      
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
      
      // Notify the booking service about the failed payment via Kafka
      if (payment) {
        await produceMessage('payment-events', {
          type: 'PAYMENT_FAILED',
          bookingId: payment.bookingId,
          paymentId: payment.id,
          error: error.message
        });
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

  async cancelPaymentByBookingId(bookingId: string): Promise<void> {
    try {
      // Find the payment by booking ID
      const payment = await this.prisma.payment.findUnique({
        where: { bookingId },
      });

      if (!payment) {
        logger.log(`No payment found for booking ${bookingId} to cancel`);
        return;
      }

      await this.cancelPayment(payment.id);
      logger.log(`Payment for booking ${bookingId} cancelled successfully`);
    } catch (error) {
      logger.error(`Failed to cancel payment for booking ${bookingId}: ${error.message}`);
    }
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

        // Notify the booking service about the refund via Kafka
        await produceMessage('payment-events', {
          type: 'PAYMENT_REFUNDED',
          bookingId: payment.bookingId,
          paymentId: payment.id
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

      // Notify the booking service about the cancellation via Kafka
      await produceMessage('payment-events', {
        type: 'PAYMENT_CANCELLED',
        bookingId: payment.bookingId,
        paymentId: payment.id
      });

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
} 