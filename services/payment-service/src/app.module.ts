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
import { PaymentResolver } from './resolvers/payment.resolver';
import { GraphQLJSON } from './models/payment.model';
import { MiddlewareModule } from './middleware/middleware.module';


@Module({
  imports: [
    ConfigModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: process.env.NODE_ENV !== 'production',
      resolvers: { JSONObject: GraphQLJSON },
      context: ({ req }) => ({ req }), // Pass request with user context to resolvers
    }),
    HttpModule,
    MiddlewareModule,
  ],
  controllers: [AppController],
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
