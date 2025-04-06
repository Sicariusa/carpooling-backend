import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import axios from 'axios';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
    }),
  );

  // ✅ Enable CORS
  app.enableCors({
    origin: '*', // In production, specify your frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Kafka is now initialized in the RideService

  // Add axios interceptor for debugging API calls to user service
  axios.interceptors.request.use(request => {
    //console.log('Starting Request to User Service:', request.method, request.url);
    return request;
  });

  axios.interceptors.response.use(response => {
    //console.log('Response from User Service:', response.status);
    return response;
  }, error => {
    console.error('Error in User Service request:', error.message);
    return Promise.reject(error);
  });

  // ✅ Start the server
  const port = process.env.PORT ?? 3004;
  await app.listen(port);
  console.log(`🚀 Payment-Service running on: ${await app.getUrl()}`);
  console.log(`📌 GraphQL Playground: http://localhost:${port}/graphql`);
}
bootstrap();
