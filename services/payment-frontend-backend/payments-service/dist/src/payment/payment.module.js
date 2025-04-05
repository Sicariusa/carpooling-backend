"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModule = void 0;
const common_1 = require("@nestjs/common");
const payment_service_1 = require("./payment.service");
const payment_resolver_1 = require("./payment.resolver");
const email_service_1 = require("./email.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const prisma_module_1 = require("../../prisma/prisma.module");
const kafka_service_1 = require("./kafka.service");
const payment_event_consumer_1 = require("./payment-event.consumer");
const booking_payment_consumer_1 = require("./booking-payment.consumer");
let PaymentModule = class PaymentModule {
};
exports.PaymentModule = PaymentModule;
exports.PaymentModule = PaymentModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        providers: [payment_service_1.PaymentService, payment_resolver_1.PaymentResolver, email_service_1.EmailService, prisma_service_1.PrismaService, kafka_service_1.KafkaService, payment_event_consumer_1.PaymentEventConsumer, booking_payment_consumer_1.BookingPaymentConsumer],
    })
], PaymentModule);
//# sourceMappingURL=payment.module.js.map