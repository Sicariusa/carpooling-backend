import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { connectConsumer, startConsumer } from './utils/kafka';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: false,
      exceptionFactory: (errors) => {
        console.log('Validation errors:', JSON.stringify(errors, null, 2));
        return new Error('Validation failed: ' + JSON.stringify(errors));
      },
    }),
  );

  // ✅ Enable CORS
  app.enableCors();

  // ✅ Start Kafka Consumer
  await connectConsumer();
  await startConsumer();

  // ✅ Start the server
  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`🚀 Ride-Service running on: ${await app.getUrl()}`);
  console.log(`📌 GraphQL Playground: http://localhost:${port}/graphql`);
}
bootstrap();
