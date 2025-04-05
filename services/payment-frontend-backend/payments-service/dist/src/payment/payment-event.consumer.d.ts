import { OnModuleInit } from '@nestjs/common';
import { EmailService } from './email.service';
export declare class PaymentEventConsumer implements OnModuleInit {
    private readonly emailService;
    private kafka;
    private consumer;
    constructor(emailService: EmailService);
    onModuleInit(): Promise<void>;
}
