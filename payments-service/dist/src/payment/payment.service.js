"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const dotenv = require("dotenv");
const common_1 = require("@nestjs/common");
const stripe_1 = require("stripe");
const prisma_service_1 = require("../../prisma/prisma.service");
const amqp = require("amqplib");
const email_service_1 = require("./email.service");
dotenv.config();
let PaymentService = class PaymentService {
    constructor(prisma, emailService) {
        this.prisma = prisma;
        this.emailService = emailService;
        this.stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, { apiVersion: null });
        this.connectToRabbitMQ();
    }
    async connectToRabbitMQ() {
        try {
            const connection = await amqp.connect(process.env.RABBITMQ_URL);
            this.channel = await connection.createChannel();
            await this.channel.assertQueue('payment-status', { durable: false });
            console.log('Connected to RabbitMQ');
        }
        catch (error) {
            console.error('Error connecting to RabbitMQ:', error);
        }
    }
    async sendPaymentEvent(paymentId, status) {
        this.channel.sendToQueue('payment-status', Buffer.from(JSON.stringify({ paymentId, status })));
        console.log('Sent message:', { paymentId, status });
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
                await this.sendPaymentEvent(payment.id, 'COMPLETED');
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
                await this.sendPaymentEvent(payment.id, 'PENDING');
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
            await this.sendPaymentEvent(paymentId, 'REFUNDED');
            await this.emailService.sendEmail(email, 'Refund Confirmation', `Your payment for ride ${payment.rideId} has been refunded.`);
            return { success: true, refundId: refund.id };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
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
                await this.sendPaymentEvent(paymentId, 'CANCELED');
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
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        email_service_1.EmailService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map