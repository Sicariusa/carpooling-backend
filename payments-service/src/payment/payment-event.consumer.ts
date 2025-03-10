import { Injectable } from '@nestjs/common';
import * as amqp from 'amqplib';
import { EmailService } from './email.service';

@Injectable()
export class PaymentEventConsumer {
  private channel;

  constructor(private readonly emailService: EmailService) {
    this.connectToRabbitMQ();
  }

  private async connectToRabbitMQ() {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    this.channel = await connection.createChannel();
    await this.channel.assertQueue('payment-status', { durable: false });
    this.channel.consume('payment-status', (message) => {
      const event = JSON.parse(message.content.toString());
      this.handlePaymentEvent(event);
      this.channel.ack(message);
    });
  }

  private async handlePaymentEvent(event: any) {
    const { paymentId, status } = event;
    if (status === 'PENDING') {
      await this.emailService.sendEmail('user@example.com', 'Payment Pending', `Payment ID: ${paymentId} is pending.`);
    } else if (status === 'REFUNDED') {
      await this.emailService.sendEmail('user@example.com', 'Payment Refunded', `Payment ID: ${paymentId} has been refunded.`);
    }
  }
}
