"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
// src/app.module.ts
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const middleware_module_1 = require("./auth/middleware.module");
const graphql_1 = require("@nestjs/graphql");
const apollo_1 = require("@nestjs/apollo"); // 👈 Add this
const path_1 = require("path"); // 👈 For auto schema
const payment_module_1 = require("./payment/payment.module");
const webhook_module_1 = require("./payment/webhook.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            graphql_1.GraphQLModule.forRoot({
                driver: apollo_1.ApolloDriver, // 👈 Required
                autoSchemaFile: (0, path_1.join)(process.cwd(), 'src/schema.gql'),
                context: ({ req }) => ({ req }),
            }),
            middleware_module_1.MiddlewareModule,
            payment_module_1.PaymentModule,
            webhook_module_1.WebhookModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map