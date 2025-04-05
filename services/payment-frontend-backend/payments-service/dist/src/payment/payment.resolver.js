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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentResolver = void 0;
const graphql_1 = require("@nestjs/graphql");
const payment_service_1 = require("./payment.service");
const payment_response_dto_1 = require("./payment-response.dto");
const cancel_payment_response_dto_1 = require("./cancel-payment.response.dto");
const payment_model_1 = require("./payment.model");
let PaymentResolver = class PaymentResolver {
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    async getPaymentsForUser(userId) {
        return this.paymentService.getPaymentsByUser(userId);
    }
    async makePayment(userId, rideId, amount, paymentMethod, paymentToken, email) {
        const result = await this.paymentService.processPayment(userId, rideId, amount, paymentMethod, paymentToken, email);
        if (!result.success)
            throw new Error(result.error);
        return { clientSecret: result.clientSecret, message: result.message };
    }
    async confirmCardPayment(paymentId) {
        await this.paymentService.markPaymentAsCompleted(paymentId);
        return `Payment ${paymentId} marked as COMPLETED.`;
    }
    async refundPayment(paymentId, email) {
        const result = await this.paymentService.refundPayment(paymentId, email);
        if (!result.success)
            throw new Error(result.error);
        return `Refund successful: ${result.refundId}`;
    }
    async cancelPayment(paymentId) {
        const result = await this.paymentService.cancelPayment(paymentId);
        return { success: result.success, message: result.message };
    }
};
exports.PaymentResolver = PaymentResolver;
__decorate([
    (0, graphql_1.Query)(() => [payment_model_1.PaymentObject]),
    __param(0, (0, graphql_1.Args)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentResolver.prototype, "getPaymentsForUser", null);
__decorate([
    (0, graphql_1.Mutation)(() => payment_response_dto_1.PaymentResponse),
    __param(0, (0, graphql_1.Args)('userId')),
    __param(1, (0, graphql_1.Args)('rideId')),
    __param(2, (0, graphql_1.Args)('amount')),
    __param(3, (0, graphql_1.Args)('paymentMethod')),
    __param(4, (0, graphql_1.Args)('paymentToken', { nullable: true })),
    __param(5, (0, graphql_1.Args)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], PaymentResolver.prototype, "makePayment", null);
__decorate([
    (0, graphql_1.Mutation)(() => String),
    __param(0, (0, graphql_1.Args)('paymentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentResolver.prototype, "confirmCardPayment", null);
__decorate([
    (0, graphql_1.Mutation)(() => String),
    __param(0, (0, graphql_1.Args)('paymentId')),
    __param(1, (0, graphql_1.Args)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PaymentResolver.prototype, "refundPayment", null);
__decorate([
    (0, graphql_1.Mutation)(() => cancel_payment_response_dto_1.CancelPaymentResponse),
    __param(0, (0, graphql_1.Args)('paymentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PaymentResolver.prototype, "cancelPayment", null);
exports.PaymentResolver = PaymentResolver = __decorate([
    (0, graphql_1.Resolver)(),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentResolver);
//# sourceMappingURL=payment.resolver.js.map