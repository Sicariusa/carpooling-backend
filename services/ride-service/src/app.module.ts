import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RideModule } from './modules/ride.module';
import { ZoneModule } from './modules/zone.module';
import { StopModule } from './modules/stop.module';
import { MiddlewareModule } from './middleware/middleware.module';
import { RideService } from './services/ride.service';
import { RideResolver } from './resolvers/ride.resolver';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '/.env',
      load: [() => ({
        USER_SERVICE_URL: process.env.USER_SERVICE_URL || 'http://localhost:3000',
        BOOKING_SERVICE_URL: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
        NOTIFICATION_SERVICE_URL: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
        MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://AhmedKhadrawy:pZ1war9xi3KkP5jG@database.r38ac.mongodb.net/ride-service'
      })],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: true,
      context: ({ req }) => ({ req }),
    }),
    RideModule,
    ZoneModule,
    StopModule,
    MiddlewareModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
