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
      disableErrorMessages: false,
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

  // Add axios interceptor for debugging API calls to user service
  axios.interceptors.request.use(request => {
    console.log('Starting Request to User Service:', request.method, request.url);
    return request;
  });

  axios.interceptors.response.use(response => {
    console.log('Response from User Service:', response.status);
    return response;
  }, error => {
    console.error('Error in User Service request:', error.message);
    return Promise.reject(error);
  });

  // Start the server
  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`Booking service running on http://localhost:${port}`);
}

bootstrap();
