import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import axios from 'axios';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for cross-service communication
  app.enableCors({
    origin: '*', // In production, specify your frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Apply validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Booking Service API')
    .setDescription('API for managing bookings in the carpooling system')
    .setVersion('1.0')
    .addTag('bookings')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Add axios interceptor for debugging API calls
  axios.interceptors.request.use(request => {
    const serviceMap = {
      '3000': 'User Service',
      '3002': 'Ride Service',
      '3004': 'Payment Service'
    };
    const url = new URL(request.url);
    const serviceName = serviceMap[url.port] || 'Unknown Service';
    console.log(`Starting Request to ${serviceName}:`, request.method, request.url);
    return request;
  });

  axios.interceptors.response.use(response => {
    const serviceMap = {
      '3000': 'User Service',
      '3002': 'Ride Service',
      '3004': 'Payment Service'
    };
    const url = new URL(response.config.url);
    const serviceName = serviceMap[url.port] || 'Unknown Service';
    console.log(`Response from ${serviceName}:`, response.status);
    return response;
  }, error => {
    const url = error.config?.url ? new URL(error.config.url) : null;
    const serviceMap = {
      '3000': 'User Service',
      '3002': 'Ride Service',
      '3004': 'Payment Service'
    };
    const serviceName = url ? serviceMap[url.port] || 'Unknown Service' : 'Unknown Service';
    console.error(`Error in ${serviceName} request:`, error.message);
    return Promise.reject(error);
  });

  // Kafka is now initialized in the BookingService

  // Start the server
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Booking Service is running on: http://localhost:${port}`);
  console.log(`📌 GraphQL Playground: http://localhost:${port}/graphql`);
}

bootstrap();
