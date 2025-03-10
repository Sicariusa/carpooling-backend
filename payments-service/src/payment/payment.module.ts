import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';
import { EmailService } from './email.service';  // Make sure this is correct
import { PrismaService } from 'prisma/prisma.service';  // Make sure this import is correct
import { PrismaModule } from 'prisma/prisma.module';  // Ensure PrismaModule is imported

@Module({
  imports: [PrismaModule],  // Add this line to import PrismaModule
  providers: [PaymentService, PaymentResolver,EmailService,PrismaService],  // Ensure PaymentService is in the providers array
})
export class PaymentModule {}
