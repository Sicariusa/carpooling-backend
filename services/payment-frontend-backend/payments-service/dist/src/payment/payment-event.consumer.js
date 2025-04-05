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
const kafkajs_1 = require("kafkajs");
const email_service_1 = require("./email.service");
let PaymentEventConsumer = class PaymentEventConsumer {
    constructor(emailService) {
        this.emailService = emailService;
        this.kafka = new kafkajs_1.Kafka({ clientId: 'payment-consumer', brokers: ['localhost:9092'] });
        this.consumer = this.kafka.consumer({ groupId: 'payment-group' });
    }
    async onModuleInit() {
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'payment-status', fromBeginning: true });
        await this.consumer.run({
            eachMessage: async ({ message }) => {
                const event = JSON.parse(message.value.toString());
                const { paymentId, status } = event;
                if (status === 'COMPLETED') {
                    await this.emailService.sendEmail('driver@example.com', 'Payment Received', `Payment ${paymentId} has been completed.`);
                }
                else if (status === 'CANCELED') {
                    await this.emailService.sendEmail('driver@example.com', 'Payment Canceled', `Payment ${paymentId} was canceled.`);
                }
                else if (status === 'REFUNDED') {
                    await this.emailService.sendEmail('driver@example.com', 'Refund Issued', `Payment ${paymentId} was refunded.`);
                }
                console.log('📥 Handled payment event:', event);
            },
        });
    }
};
exports.PaymentEventConsumer = PaymentEventConsumer;
exports.PaymentEventConsumer = PaymentEventConsumer = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService])
], PaymentEventConsumer);
//# sourceMappingURL=payment-event.consumer.js.map