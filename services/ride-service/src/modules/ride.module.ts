import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RideService } from '../services/ride.service';
import { RideResolver } from '../resolvers/ride.resolver';
import { Ride, RideSchema } from '../schemas/ride.schema';
import { RouteModule } from './route.module';
import { ZoneModule } from './zone.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ride.name, schema: RideSchema }]),
    RouteModule,
    ZoneModule,
  ],
  providers: [RideService, RideResolver],
  exports: [RideService],
})
export class RideModule {}
