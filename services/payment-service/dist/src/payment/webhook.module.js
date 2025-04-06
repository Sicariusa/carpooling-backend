"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookModule = void 0;
const common_1 = require("@nestjs/common");
const webhook_controller_1 = require("../controllers/webhook.controller"); // Adjust path
const payment_service_1 = require("../payment/payment.service");
const prisma_service_1 = require("../../prisma/prisma.service"); // Ensure PrismaService is correctly imported
const bodyParser = require("body-parser");
const payment_module_1 = require("./payment.module");
let WebhookModule = class WebhookModule {
    configure(consumer) {
        consumer
            .apply(bodyParser.raw({ type: 'application/json' })) // Ensures raw body parsing for webhook
            .forRoutes('webhook');
    }
};
exports.WebhookModule = WebhookModule;
exports.WebhookModule = WebhookModule = __decorate([
    (0, common_1.Module)({
        imports: [payment_module_1.PaymentModule],
        controllers: [webhook_controller_1.WebhookController],
        providers: [payment_service_1.PaymentService, prisma_service_1.PrismaService],
    })
], WebhookModule);
//# sourceMappingURL=webhook.module.js.map