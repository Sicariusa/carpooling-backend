import { Module } from "@nestjs/common";
import { RideService } from './ride.service';
import { RideResolver } from './ride.resolver';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [RideService, RideResolver, PrismaService],
})
export class RideModule {}