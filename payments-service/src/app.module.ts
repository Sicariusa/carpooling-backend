import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { PaymentModule } from './payment/payment.module';
import { PrismaModule } from 'prisma/prisma.module';
@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true, // Generates GraphQL schema automatically
    }),
    PaymentModule,  // Register your payment module
    PrismaModule,   // Add PrismaModule to provide PrismaService to your application
  ],
})
export class AppModule {}
