import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  imports: [ConfigModule.forRoot()],
  providers: [PaymentService, PaymentResolver, PrismaService],
})
export class PaymentModule {}
