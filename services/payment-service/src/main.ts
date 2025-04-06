import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // For Stripe webhooks, we need the raw body
  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));
  
  // For other routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Enable CORS
  app.enableCors();

  const port = process.env.PORT || 3002;
  await app.listen(port);
  logger.log(`Payment service running on port ${port}`);
}
bootstrap();
