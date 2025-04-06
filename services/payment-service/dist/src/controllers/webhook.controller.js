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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookController = void 0;
const common_1 = require("@nestjs/common");
const stripe_1 = __importDefault(require("stripe"));
const payment_service_1 = require("../payment/payment.service");
const config_1 = require("@nestjs/config");
let WebhookController = class WebhookController {
    constructor(paymentService, config) {
        this.paymentService = paymentService;
        this.config = config;
    }
    async handleWebhook(req, res, sig, body) {
        const stripe = new stripe_1.default(this.config.getOrThrow('STRIPE_SECRET_KEY'), {
            apiVersion: '2025-03-31.basil',
        });
        let event;
        try {
            // Make sure you pass the raw body
            event = stripe.webhooks.constructEvent(body, sig, this.config.getOrThrow('STRIPE_WEBHOOK_SECRET'));
        }
        catch (err) {
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        // Handle the webhook event
        await this.paymentService.handleWebhookEvent(event);
        res.send({ received: true });
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Headers)('stripe-signature')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleWebhook", null);
exports.WebhookController = WebhookController = __decorate([
    (0, common_1.Controller)('webhook'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService,
        config_1.ConfigService])
], WebhookController);
//# sourceMappingURL=webhook.controller.js.map