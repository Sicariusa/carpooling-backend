"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({ origin: '*', credentials: true });
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('PORT') || 3003;
    await app.listen(port);
    console.log(`🚀 Payments Service is running on: http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map