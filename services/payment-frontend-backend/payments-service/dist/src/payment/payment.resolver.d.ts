import { PaymentService } from './payment.service';
import { PaymentResponse } from './payment-response.dto';
import { CancelPaymentResponse } from './cancel-payment.response.dto';
import { PaymentObject } from './payment.model';
export declare class PaymentResolver {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    getPaymentsForUser(userId: string): Promise<PaymentObject[]>;
    makePayment(userId: string, rideId: string, amount: number, paymentMethod: string, paymentToken: string, email: string): Promise<PaymentResponse>;
    confirmCardPayment(paymentId: string): Promise<string>;
    refundPayment(paymentId: string, email: string): Promise<string>;
    cancelPayment(paymentId: string): Promise<CancelPaymentResponse>;
}
