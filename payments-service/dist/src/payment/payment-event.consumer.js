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
exports.PaymentEventConsumer = void 0;
const common_1 = require("@nestjs/common");
const amqp = require("amqplib");
const email_service_1 = require("./email.service");
let PaymentEventConsumer = class PaymentEventConsumer {
    constructor(emailService) {
        this.emailService = emailService;
        this.connectToRabbitMQ();
    }
    async connectToRabbitMQ() {
        const connection = await amqp.connect(process.env.RABBITMQ_URL);
        this.channel = await connection.createChannel();
        await this.channel.assertQueue('payment-status', { durable: false });
        this.channel.consume('payment-status', (message) => {
            const event = JSON.parse(message.content.toString());
            this.handlePaymentEvent(event);
            this.channel.ack(message);
        });
    }
    async handlePaymentEvent(event) {
        const { paymentId, status } = event;
        if (status === 'PENDING') {
            await this.emailService.sendEmail('user@example.com', 'Payment Pending', `Payment ID: ${paymentId} is pending.`);
        }
        else if (status === 'REFUNDED') {
            await this.emailService.sendEmail('user@example.com', 'Payment Refunded', `Payment ID: ${paymentId} has been refunded.`);
        }
    }
};
exports.PaymentEventConsumer = PaymentEventConsumer;
exports.PaymentEventConsumer = PaymentEventConsumer = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], PaymentEventConsumer);
//# sourceMappingURL=payment-event.consumer.js.map