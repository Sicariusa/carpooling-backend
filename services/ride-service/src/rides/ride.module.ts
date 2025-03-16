import { Module } from "@nestjs/common";
import { RideService } from './ride.service';
import { RideResolver } from './ride.resolver';
import { RideController } from './ride.controller';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [RideController],
  providers: [RideService, RideResolver, PrismaService],
  exports: [RideService],
})
export class RideModule {}