"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const dotenv = __importStar(require("dotenv"));
const common_1 = require("@nestjs/common");
const stripe_1 = __importDefault(require("stripe"));
const prisma_service_1 = require("../../prisma/prisma.service");
const email_service_1 = require("./email.service");
const kafka_service_1 = require("./kafka.service");
dotenv.config();
let PaymentService = class PaymentService {
    constructor(prisma, emailService, kafkaService) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.kafkaService = kafkaService;
        this.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: null });
    }
    async processPayment(userId, rideId, amount, paymentMethod, paymentToken = '', email) {
        try {
            if (paymentMethod === 'cash') {
                const payment = await this.prisma.payment.create({
                    data: {
                        userId,
                        rideId,
                        amount,
                        status: 'COMPLETED',
                        transactionId: 'N/A',
                    },
                });
                await this.kafkaService.send('payment-status', { paymentId: payment.id, status: 'COMPLETED' });
                await this.emailService.sendEmail(email, 'Payment Confirmation', `Your cash payment of $${amount} for ride ${rideId} is successful.`);
                return { success: true, message: 'Cash payment processed successfully' };
            }
            else if (paymentMethod === 'card' && paymentToken) {
                const paymentMethodObj = await this.stripe.paymentMethods.create({
                    type: 'card',
                    card: {
                        token: paymentToken,
                    },
                });
                const paymentIntent = await this.stripe.paymentIntents.create({
                    amount: amount * 100,
                    currency: 'usd',
                    payment_method: paymentMethodObj.id,
                    automatic_payment_methods: {
                        enabled: true,
                    },
                });
                const payment = await this.prisma.payment.create({
                    data: {
                        userId,
                        rideId,
                        amount,
                        status: 'PENDING',
                        transactionId: paymentIntent.id,
                    },
                });
                await this.kafkaService.send('payment-status', { paymentId: payment.id, status: 'PENDING' });
                await this.emailService.sendEmail(email, 'Payment Confirmation', `Your payment of $${amount} for ride ${rideId} is being processed.`);
                return { success: true, clientSecret: paymentIntent.client_secret };
            }
            else {
                throw new Error('Invalid payment method or missing payment token');
            }
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async refundPayment(paymentId, email) {
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { id: paymentId },
            });
            if (!payment || payment.status !== 'COMPLETED') {
                throw new Error('Refund can only be processed for completed payments.');
            }
            const refund = await this.stripe.refunds.create({
                payment_intent: payment.transactionId,
            });
            await this.prisma.payment.update({
                where: { id: paymentId },
                data: { status: 'REFUNDED' },
            });
            await this.kafkaService.send('payment-status', { paymentId, status: 'REFUNDED' });
            await this.emailService.sendEmail(email, 'Refund Confirmation', `Your payment for ride ${payment.rideId} has been refunded.`);
            return { success: true, refundId: refund.id };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async markPaymentAsCompleted(paymentId) {
        const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment || payment.status !== 'PENDING') {
            throw new Error('Only pending payments can be marked as completed.');
        }
        await this.prisma.payment.update({
            where: { id: paymentId },
            data: { status: 'COMPLETED' },
        });
        await this.kafkaService.send('payment-status', {
            paymentId,
            status: 'COMPLETED',
        });
        await this.emailService.sendEmail('testuser@example.com', 'Payment Completed', `Your card payment for ride ${payment.rideId} has been confirmed.`);
    }
    async cancelPayment(paymentId) {
        try {
            const payment = await this.prisma.payment.findUnique({
                where: { id: paymentId },
            });
            if (!payment) {
                return { success: false, message: 'Payment not found' };
            }
            if (payment.status === 'PENDING') {
                if (payment.transactionId) {
                    await this.stripe.paymentIntents.cancel(payment.transactionId);
                }
                await this.prisma.payment.update({
                    where: { id: paymentId },
                    data: { status: 'FAILED' },
                });
                await this.kafkaService.send('payment-status', { paymentId, status: 'CANCELED' });
                return { success: true, message: 'Payment successfully canceled' };
            }
            else {
                return { success: false, message: 'Payment cannot be canceled, it is not in PENDING state' };
            }
        }
        catch (error) {
            return { success: false, message: error.message };
        }
    }
    async getPaymentsByUser(userId) {
        const payments = await this.prisma.payment.findMany({ where: { userId } });
        return payments.map((p) => ({
            ...p,
            amount: Number(p.amount),
        }));
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService,
        kafka_service_1.KafkaService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map