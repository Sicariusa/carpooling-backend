import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentService } from './services/payment.service';
import { PrismaService } from './services/prisma.service';
import { BookingService } from './services/booking.service';
import { StripeConfigService } from './config/stripe.config';
import { PaymentResolver } from './controllers/payment.resolver';
import { WebhookController } from './controllers/webhook.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AppController, WebhookController],
  providers: [
    AppService,
    PrismaService,
    PaymentService,
    BookingService,
    StripeConfigService,
    PaymentResolver,
  ],
})
export class AppModule {}
