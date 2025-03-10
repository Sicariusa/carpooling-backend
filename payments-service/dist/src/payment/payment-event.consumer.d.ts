import { EmailService } from './email.service';
export declare class PaymentEventConsumer {
    private readonly emailService;
    private channel;
    constructor(emailService: EmailService);
    private connectToRabbitMQ;
    private handlePaymentEvent;
}
