import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { PaymentModule } from './payment/payment.module';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,  // This will auto-generate the GraphQL schema
      sortSchema: true,      // Optional: Sort the schema for readability
      playground: true,      // Optional: Enable GraphQL Playground
    }),
    PaymentModule,  // Register your payment module
    PrismaModule,   // Add PrismaModule to provide PrismaService to your application
  ],
})
export class AppModule {}
