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
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const stripe_1 = __importDefault(require("stripe"));
const nodemailer = __importStar(require("nodemailer"));
const config_1 = require("@nestjs/config");
let PaymentService = class PaymentService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.stripe = new stripe_1.default(this.config.getOrThrow('STRIPE_SECRET_KEY'), {
            apiVersion: '2025-03-31.basil',
        });
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.config.get('EMAIL_USER'),
                pass: this.config.get('EMAIL_PASSWORD'),
            },
        });
    }
    async createPaymentIntent(data, userId) {
        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: data.amount * 100,
            currency: 'egp',
        });
        const payment = await this.prisma.payment.create({
            data: {
                userId,
                bookingId: data.bookingId,
                amount: data.amount,
                currency: 'egp',
                paymentIntentId: paymentIntent.id,
                status: 'pending',
            },
        });
        return {
            clientSecret: paymentIntent.client_secret,
            payment,
        };
    }
    async handleWebhookEvent(event) {
        if (event.type === 'payment_intent.succeeded') {
            const intent = event.data.object;
            await this.prisma.payment.updateMany({
                where: { paymentIntentId: intent.id },
                data: { status: 'succeeded' },
            });
        }
    }
    async getPaymentsByUser(userId) {
        return this.prisma.payment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }
    async getPaymentById(id, userId) {
        const payment = await this.prisma.payment.findUnique({ where: { id } });
        if (!payment || payment.userId !== userId) {
            throw new Error('Not authorized or payment not found');
        }
        return payment;
    }
    async refundPayment(id, user) {
        const payment = await this.prisma.payment.findUnique({ where: { id } });
        if (!payment)
            throw new Error('Payment not found');
        if (user.role !== 'ADMIN')
            throw new Error('Unauthorized refund');
        // Optional: implement Stripe refund logic if real refunds are needed
        return this.prisma.payment.update({
            where: { id },
            data: { status: 'refunded' },
        });
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map