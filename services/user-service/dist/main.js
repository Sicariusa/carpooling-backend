"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
        disableErrorMessages: false,
        exceptionFactory: (errors) => {
            console.log('Validation errors:', JSON.stringify(errors, null, 2));
            return new Error('Validation failed: ' + JSON.stringify(errors));
        },
    }));
    app.enableCors();
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`Application is running on: ${await app.getUrl()}`);
    console.log(`GraphQL Playground: http://localhost:${port}/graphql`);
}
bootstrap();
//# sourceMappingURL=main.js.map