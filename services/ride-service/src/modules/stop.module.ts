import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StopService } from '../services/stop.service';
import { StopResolver } from '../resolvers/stop.resolver';
import { Stop, StopSchema } from '../schemas/stop.schema';
import { ZoneModule } from './zone.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Stop.name, schema: StopSchema }]),
    ZoneModule,
  ],
  providers: [StopService, StopResolver],
  exports: [StopService],
})
export class StopModule {}
