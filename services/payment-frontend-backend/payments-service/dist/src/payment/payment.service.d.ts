import { PrismaService } from 'prisma/prisma.service';
import { EmailService } from './email.service';
import { KafkaService } from './kafka.service';
import { PaymentObject } from './payment.model';
export declare class PaymentService {
    private prisma;
    private emailService;
    private kafkaService;
    private stripe;
    constructor(prisma: PrismaService, emailService: EmailService, kafkaService: KafkaService);
    processPayment(userId: string, rideId: string, amount: number, paymentMethod: string, paymentToken: string, email: string): Promise<{
        success: boolean;
        message: string;
        clientSecret?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        clientSecret: string;
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        clientSecret?: undefined;
    }>;
    refundPayment(paymentId: string, email: string): Promise<{
        success: boolean;
        refundId: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        refundId?: undefined;
    }>;
    markPaymentAsCompleted(paymentId: string): Promise<void>;
    cancelPayment(paymentId: string): Promise<{
        success: boolean;
        message: any;
    }>;
    getPaymentsByUser(userId: string): Promise<PaymentObject[]>;
}
