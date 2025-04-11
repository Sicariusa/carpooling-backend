import { Module } from '@nestjs/common';
import { WebhookController } from '../controllers/webhook.controller';
import { PaymentService } from '../payment/payment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentModule } from './payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [WebhookController],
  providers: [PaymentService, PrismaService],
})
export class WebhookModule {}