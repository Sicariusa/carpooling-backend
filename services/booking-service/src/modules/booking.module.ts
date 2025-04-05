import { Module } from '@nestjs/common';
import { BookingResolver } from '../resolvers/booking.resolver';
import { BookingService } from '../services/booking.service';
import { PrismaService } from '../services/prisma.service';


@Module({
  providers: [BookingService, BookingResolver, PrismaService],
})
export class BookingModule {}