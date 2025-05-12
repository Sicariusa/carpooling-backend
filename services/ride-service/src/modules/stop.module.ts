import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StopService } from '../services/stop.service';
import { Stop, StopSchema } from '../schemas/stop.schema';
import { ZoneModule } from './zone.module';
import { StopResolver } from 'src/resolvers/stop.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Stop.name, schema: StopSchema }]),
    ZoneModule,
  ],
  providers: [StopService,StopResolver],
  exports: [StopService],
})
export class StopModule {} 