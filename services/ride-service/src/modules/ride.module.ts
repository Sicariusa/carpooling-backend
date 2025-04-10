import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RideService } from '../services/ride.service';
import { RideResolver } from '../resolvers/ride.resolver';
import { Ride, RideSchema } from '../schemas/ride.schema';
import { ZoneModule } from './zone.module';
import { StopModule } from './stop.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ride.name, schema: RideSchema }]),
    ZoneModule,
    StopModule,
  ],
  providers: [RideService, RideResolver],
  exports: [RideService],
})
export class RideModule {}
