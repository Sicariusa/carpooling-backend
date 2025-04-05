import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, EachMessagePayload } from 'kafkajs';
import { EmailService } from './email.service';

@Injectable()
export class PaymentEventConsumer implements OnModuleInit {
  private kafka = new Kafka({ clientId: 'payment-consumer', brokers: ['localhost:9092'] });
  private consumer = this.kafka.consumer({ groupId: 'payment-group' });

  constructor(private readonly emailService: EmailService) {}

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'payment-status', fromBeginning: true });

    await this.consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        const event = JSON.parse(message.value.toString());
        const { paymentId, status } = event;

        // 🔔 Simulate notifying the driver
        if (status === 'COMPLETED') {
          await this.emailService.sendEmail('driver@example.com', 'Payment Received', `Payment ${paymentId} has been completed.`);
        } else if (status === 'CANCELED') {
          await this.emailService.sendEmail('driver@example.com', 'Payment Canceled', `Payment ${paymentId} was canceled.`);
        } else if (status === 'REFUNDED') {
          await this.emailService.sendEmail('driver@example.com', 'Refund Issued', `Payment ${paymentId} was refunded.`);
        }

        console.log('📥 Handled payment event:', event);
      },
    });
  }
}
