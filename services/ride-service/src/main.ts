import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

async function bootstrap() {
  dotenv.config();
  
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for microservice communication
  app.enableCors({
    origin: [
      'http://localhost:3000',  // User Service
      'http://localhost:3001',  // API Gateway
      'http://localhost:3003',  // Booking Service
      'http://localhost:3004',  // Payment Service
      'http://localhost:3005',  // Notification Service
      'http://localhost:4200',  // Frontend
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
  });
  
  // Create a global prefix for all routes
  app.setGlobalPrefix('api');
  
  // Use validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Ride Service API')
    .setDescription('API documentation for the Ride Service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3002;
  
  await app.listen(port);
  console.log(`Ride service running on port ${port}`);
  console.log(`GraphQL Playground: http://localhost:${port}/graphql`);
  console.log(`MongoDB URI: ${configService.get<string>('MONGODB_URI')}`);
}

bootstrap();
