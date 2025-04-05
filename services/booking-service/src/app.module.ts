// src/app.module.ts

import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppController } from 'src/app.controller';
import { AppService } from 'src/app.service';
import { BookingModule } from './modules/booking.module';
import { PrismaService } from './services/prisma.service';
import { MiddlewareModule } from './middleware/middleware.module';


@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'), // Generate schema file
      playground: true, // Enable GraphQL Playground
      context: ({ req }) => ({ req }), // Pass request object to context
    }),
    BookingModule,
    MiddlewareModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}