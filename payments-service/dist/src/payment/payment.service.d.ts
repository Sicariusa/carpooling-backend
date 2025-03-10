import { PrismaService } from 'prisma/prisma.service';
import { EmailService } from './email.service';
export declare class PaymentService {
    private prisma;
    private emailService;
    private stripe;
    private channel;
    constructor(prisma: PrismaService, emailService: EmailService);
    private connectToRabbitMQ;
    private sendPaymentEvent;
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
    cancelPayment(paymentId: string): Promise<{
        success: boolean;
        message: any;
    }>;
}
