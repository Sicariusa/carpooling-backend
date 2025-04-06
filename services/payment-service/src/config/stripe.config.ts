import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeConfigService {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16', // Use the latest stable API version
    });
  }

  getStripe(): Stripe {
    return this.stripe;
  }
} 