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
exports.BookingPaymentConsumer = void 0;
const common_1 = require("@nestjs/common");
const kafkajs_1 = require("kafkajs");
const payment_service_1 = require("./payment.service");
const common_2 = require("@nestjs/common");
const logger = new common_2.Logger('BookingPaymentConsumer');
let BookingPaymentConsumer = class BookingPaymentConsumer {
    constructor(paymentService) {
        this.paymentService = paymentService;
        this.kafka = new kafkajs_1.Kafka({ clientId: 'payment-consumer', brokers: ['localhost:9092'] });
        this.consumer = this.kafka.consumer({ groupId: 'payment-service-group' });
    }
    async onModuleInit() {
        await this.consumer.connect();
        await this.consumer.subscribe({ topic: 'booking-events', fromBeginning: true });
        await this.consumer.run({
            eachMessage: async ({ message }) => {
                const payload = JSON.parse(message.value.toString());
                logger.log(`📥 [booking-events] ${payload.type}:`, payload);
                if (payload.type === 'BOOKING_ACCEPTED') {
                    const { userId, rideId, amount, paymentMethod, paymentToken, email, } = payload;
                    try {
                        await this.paymentService.processPayment(userId, rideId, amount, paymentMethod, paymentToken, email);
                        logger.log(`✅ Payment auto-triggered for booking ${payload.bookingId}`);
                    }
                    catch (err) {
                        logger.error(`❌ Failed to process payment for booking ${payload.bookingId}: ${err.message}`);
                    }
                }
            },
        });
    }
};
exports.BookingPaymentConsumer = BookingPaymentConsumer;
exports.BookingPaymentConsumer = BookingPaymentConsumer = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], BookingPaymentConsumer);
//# sourceMappingURL=booking-payment.consumer.js.map