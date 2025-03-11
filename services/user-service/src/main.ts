import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { connectProducer } from './utils/kafka';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable detailed validation errors
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: false, // Show detailed error messages
      exceptionFactory: (errors) => {
        console.log('Validation errors:', JSON.stringify(errors, null, 2));
        return new Error('Validation failed: ' + JSON.stringify(errors));
      },
    }),
  );
  await connectProducer();  // Ensure Kafka producer is connected
  // Enable CORS
  app.enableCors();
  
  // Start the server
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`GraphQL Playground: http://localhost:${port}/graphql`);
}
bootstrap();
