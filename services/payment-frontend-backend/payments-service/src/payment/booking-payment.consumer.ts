import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, EachMessagePayload } from 'kafkajs';
import { PaymentService } from './payment.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('BookingPaymentConsumer');

@Injectable()
export class BookingPaymentConsumer implements OnModuleInit {
  private kafka = new Kafka({ clientId: 'payment-consumer', brokers: ['localhost:9092'] });
  private consumer = this.kafka.consumer({ groupId: 'payment-service-group' });

  constructor(private readonly paymentService: PaymentService) {}

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'booking-events', fromBeginning: true });

    await this.consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        const payload = JSON.parse(message.value.toString());
        logger.log(`📥 [booking-events] ${payload.type}:`, payload);

        if (payload.type === 'BOOKING_ACCEPTED') {
          const {
            userId,
            rideId,
            amount,
            paymentMethod,
            paymentToken,
            email,
          } = payload;

          try {
            await this.paymentService.processPayment(
              userId,
              rideId,
              amount,
              paymentMethod,
              paymentToken,
              email
            );
            logger.log(`✅ Payment auto-triggered for booking ${payload.bookingId}`);
          } catch (err) {
            logger.error(`❌ Failed to process payment for booking ${payload.bookingId}: ${err.message}`);
          }
        }
      },
    });
  }
}
  