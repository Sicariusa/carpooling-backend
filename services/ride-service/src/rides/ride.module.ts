import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RideService } from './ride.service';
import { RideResolver } from './ride.resolver';
import { Ride, RideSchema } from './ride.schema'; // <-- import your schema

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ride.name, schema: RideSchema }])
  ],
  providers: [RideService, RideResolver],
  exports: [RideService]
})
export class RideModule {}
