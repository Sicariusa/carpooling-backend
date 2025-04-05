import { OnModuleInit } from '@nestjs/common';
import { PaymentService } from './payment.service';
export declare class BookingPaymentConsumer implements OnModuleInit {
    private readonly paymentService;
    private kafka;
    private consumer;
    constructor(paymentService: PaymentService);
    onModuleInit(): Promise<void>;
}
