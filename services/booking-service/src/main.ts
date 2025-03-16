import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for cross-service communication
  app.enableCors();
  
  // Apply validation globally
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Booking Service API')
    .setDescription('API for managing bookings in the carpooling system')
    .setVersion('1.0')
    .addTag('bookings')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Start the server
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Booking service is running on port ${port}`);
}

bootstrap();
