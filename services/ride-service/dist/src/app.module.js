"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const apollo_1 = require("@nestjs/apollo");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const path_1 = require("path");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const ride_module_1 = require("./modules/ride.module");
const zone_module_1 = require("./modules/zone.module");
const route_module_1 = require("./modules/route.module");
const stop_module_1 = require("./modules/stop.module");
const middleware_module_1 = require("./middleware/middleware.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
                load: [() => ({
                        USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:3000',
                        BOOKING_SERVICE_URL: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
                        NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
                        MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://AhmedKhadrawy:pZ1war9xi3KkP5jG@database.r38ac.mongodb.net/ride-service'
                    })],
            }),
            mongoose_1.MongooseModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => ({
                    uri: configService.get('MONGODB_URI'),
                }),
            }),
            graphql_1.GraphQLModule.forRoot({
                driver: apollo_1.ApolloDriver,
                autoSchemaFile: (0, path_1.join)(process.cwd(), 'src/schema.gql'),
                sortSchema: true,
                playground: true,
                context: ({ req }) => ({ req }),
            }),
            ride_module_1.RideModule,
            zone_module_1.ZoneModule,
            route_module_1.RouteModule,
            stop_module_1.StopModule,
            middleware_module_1.MiddlewareModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map