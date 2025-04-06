// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MiddlewareModule } from './auth/middleware.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'; // 👈 Add this
import { join } from 'path'; // 👈 For auto schema
import { PaymentModule } from './payment/payment.module';
import { WebhookModule } from './payment/webhook.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver, // 👈 Required
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      context: ({ req }) => ({ req }),
    }),
    MiddlewareModule,
    PaymentModule,
    WebhookModule,
  ],
})
export class AppModule {}
