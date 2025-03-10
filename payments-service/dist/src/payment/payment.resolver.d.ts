import { PaymentService } from './payment.service';
import { PaymentResponse } from './payment-response.dto';
import { CancelPaymentResponse } from './cancel-payment.response.dto';
export declare class PaymentResolver {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    getHello(): Promise<string>;
    makePayment(userId: string, rideId: string, amount: number, paymentMethod: string, paymentToken: string, email: string): Promise<PaymentResponse>;
    refundPayment(paymentId: string, email: string): Promise<string>;
    cancelPayment(paymentId: string): Promise<CancelPaymentResponse>;
}
