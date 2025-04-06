import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { raw } from 'body-parser';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // Disable default body parser
  });

  // Apply raw body parser ONLY to webhook endpoint
  app.use(
    '/webhook',
    raw({
      type: 'application/json',
      limit: '10mb',
      verify: (req: any, res, buf) => {
        if (req.originalUrl === '/webhook' && Buffer.isBuffer(buf)) {
          req.rawBody = buf;
        }
        return true;
      },
    }),
  );

  // Enable regular JSON parsing for all other routes
  app.use(require('body-parser').json());

  app.enableCors({ origin: '*', credentials: true });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3003;

  await app.listen(port);
  console.log(`🚀 Payments Service is running on: http://localhost:${port}`);
}

bootstrap();