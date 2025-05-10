import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ZoneService } from '../services/zone.service';
import { Zone, ZoneSchema } from '../schemas/zone.schema';
import { StopModule } from './stop.module';
import { ZoneResolver } from '../resolvers/zone.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Zone.name, schema: ZoneSchema }]),
    forwardRef(() => StopModule)
  ],
  providers: [ZoneService, ZoneResolver],
  exports: [ZoneService],
})
export class ZoneModule {} 