import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { RideModule } from './rides/ride.module';
import { GraphQLScalarType } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import { MiddlewareModule } from './middleware/middleware.module';
import { MongooseModule } from '@nestjs/mongoose'; // ✅ Import MongooseModule
import { ConfigModule } from '@nestjs/config'; // ✅ For reading .env

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // ✅ Load environment variables
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/defaultdb'), // ✅ Mongo connection
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      resolvers: { DateTime: DateTimeResolver as GraphQLScalarType },
      context: ({ req }) => ({ req }),
    }),
    RideModule,
    MiddlewareModule,
  ],
})
export class AppModule {}
