import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { RideModule } from './rides/ride.module';
import { GraphQLScalarType } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';
import { MiddlewareModule } from './middleware/middleware.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      resolvers: { DateTime: DateTimeResolver as GraphQLScalarType }, 
      context: ({ req }) => ({ req }), // Pass request object to context
    }),
    RideModule,
    MiddlewareModule,
  ],
})
export class AppModule {}
