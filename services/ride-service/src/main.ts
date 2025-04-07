import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for cross-service communication
  app.enableCors({
    origin: '*', // In production, specify your frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Apply global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Ride Service API')
    .setDescription('API for managing rides in the carpooling system')
    .setVersion('1.0')
    .addTag('rides')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Start the server
  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`🚀 Ride Service is running on: http://localhost:${port}`);
  console.log(`📌 GraphQL Playground: http://localhost:${port}/graphql`);
}
bootstrap();
