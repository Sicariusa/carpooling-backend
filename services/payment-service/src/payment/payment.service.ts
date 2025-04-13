import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import Stripe from 'stripe';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private transporter;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.getOrThrow<string>('STRIPE_SECRET_KEY'), {
      apiVersion: '2025-03-31.basil',
    });

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.get<string>('EMAIL_USER'),
        pass: this.config.get<string>('EMAIL_PASSWORD'),
      },
    });
  }

  async createPaymentIntent(data: CreatePaymentDto, userId: string) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: data.amount * 100,
      currency: 'egp',
      metadata: { 
        userId,
        bookingId: data.bookingId 
      },
    });
  
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        bookingId: data.bookingId,
        amount: data.amount,
        currency: 'egp',
        paymentIntentId: paymentIntent.id,
        status: 'pending',
        metadata: paymentIntent.metadata 
          ? JSON.parse(JSON.stringify(paymentIntent.metadata))
          : null
      },
    });
  
    return {
      clientSecret: paymentIntent.client_secret,
      payment: {
        ...payment,
        clientSecret: paymentIntent.client_secret
      }
    };
    
  }

  async handlePaymentIntentSucceeded(paymentIntentId: string) {
    console.log('Processing success for payment intent:', paymentIntentId);
    
    try {
      // First verify the payment exists
      const payment = await this.prisma.payment.findFirst({
        where: { paymentIntentId }
      });
  
      if (!payment) {
        console.error('Payment not found for intent:', paymentIntentId);
        return;
      }
  
      console.log('Current payment status:', payment.status);
      
      // Only update if status is pending
      if (payment.status === 'pending') {
        const updated = await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'succeeded' }
        });
        
        console.log('Successfully updated payment:', updated.id);
        await this.sendPaymentConfirmation(paymentIntentId);
      } else {
        console.log('Payment already in final state:', payment.status);
      }
    } catch (error) {
      console.error('Failed to update payment status:', error);
      throw error;
    }
  }

  async handlePaymentIntentFailed(event: Stripe.Event) {
    const intent = event.data.object as Stripe.PaymentIntent;
    console.log('Payment failed:', intent.id);
  
    await this.prisma.payment.updateMany({
      where: { paymentIntentId: intent.id },
      data: { 
        status: 'failed',
        metadata: intent.last_payment_error 
          ? JSON.parse(JSON.stringify(intent.last_payment_error))
          : null
      },
    });
  
    await this.sendPaymentFailureNotification(intent.id);
  }

  async handlePaymentIntentCreated(event: Stripe.Event) {
    const intent = event.data.object as Stripe.PaymentIntent;
    console.log('Payment intent created:', intent.id);
    // Typically no action needed here, just logging
  }

  private async sendPaymentConfirmation(paymentIntentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { paymentIntentId },
    });
  
    if (!payment) return;
  
    // Fetch user email via GraphQL using userId
    const userEmail = await this.getUserEmailFromGraphQL(payment.userId);
    if (!userEmail) {
      console.warn('⚠️ No email found for userId:', payment.userId);
      return;
    }
  
    const mailOptions = {
      from: this.config.get<string>('EMAIL_USER'),
      to: userEmail,
      subject: '✅ Payment Confirmation',
      html: `
        <h2>Payment Successful</h2>
        <p>Your payment of <strong>${payment.amount} ${payment.currency.toUpperCase()}</strong> for booking <strong>${payment.bookingId}</strong> was successful.</p>
        <p>Thank you for using GIU Carpooling 🚗</p>
      `,
    };
  
    try {
      await this.transporter.sendMail(mailOptions);
      console.log('📧 Confirmation email sent to:', userEmail);
    } catch (error) {
      console.error('❌ Error sending confirmation email:', error);
    }
  }
  

  private async sendPaymentFailureNotification(paymentIntentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { paymentIntentId },
    });

    if (!payment) return;

    const mailOptions = {
      from: this.config.get<string>('EMAIL_USER'),
      to: 'EMAIL_USER', // Replace with actual user email
      subject: 'Payment Failed',
      html: `<p>Your payment of ${payment.amount} ${payment.currency} failed. Please try again.</p>`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending failure notification:', error);
    }
  }

  async getPaymentsByUser(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
  
  async getPaymentById(id: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment || payment.userId !== userId) {
      throw new Error('Not authorized or payment not found');
    }
    return payment;
  }
  
  async refundPayment(id: string, user: any) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
  
    if (!payment) throw new Error('Payment not found');
    if (user.role !== 'ADMIN') throw new Error('Unauthorized refund');
  
    if (payment.paymentIntentId) {
      try {
        // Create actual Stripe refund
        await this.stripe.refunds.create({
          payment_intent: payment.paymentIntentId,
        });
      } catch (error) {
        console.error('Stripe refund error:', error);
        throw new Error('Refund processing failed');
      }
    }
  
    return this.prisma.payment.update({
      where: { id },
      data: { status: 'refunded' },
    });
  }

  async sendConfirmationEmail(to: string, bookingId: string, amount: number) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.get('EMAIL_USER'),
        pass: this.config.get('EMAIL_PASSWORD'),
      },
    });
  
    const mailOptions = {
      from: `"GIU Carpooling" <${this.config.get('EMAIL_USER')}>`,
      to,
      subject: '✅ Payment Confirmation',
      html: `
        <h2>Payment Successful</h2>
        <p>Your payment of <strong>${amount / 100} EGP</strong> for booking <strong>${bookingId}</strong> was successful.</p>
        <p>Thank you for using GIU Carpooling 🚗</p>
      `,
    };
  
    await transporter.sendMail(mailOptions);
  }
  async getUserEmailFromGraphQL(userId: string): Promise<string | null> {
    try {
      const response = await axios.post('http://localhost:3000/graphql', {
        query: `
          query {
            getUserByUuid(id: "${userId}") {
              email
            }
          }
        `
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
  
      return response.data?.data?.getUserByUuid?.email ?? null;
    } catch (error) {
      console.error('Failed to fetch user email from GraphQL:', error.response?.data || error.message);
      return null;
    }
  }
  async handleChargeUpdated(event: Stripe.Event) {
    const charge = event.data.object as Stripe.Charge;
  
    const paymentIntentId = charge.payment_intent as string;
    const receiptUrl = charge.receipt_url;
    const refunded = charge.refunded;
  
    try {
      const payment = await this.prisma.payment.findFirst({
        where: { paymentIntentId },
      });
  
      if (!payment) {
        console.warn('No payment found for charge update:', paymentIntentId);
        return;
      }
  
      // Optional: update receipt URL or refund status
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: refunded ? 'refunded' : payment.status,
        },
      });
  
      console.log(`💾 Charge updated for payment: ${payment.id} | Refunded: ${refunded}`);
    } catch (err) {
      console.error('Error handling charge.updated:', err);
    }
  }

  
}