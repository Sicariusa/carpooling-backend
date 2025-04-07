import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ZoneService } from '../services/zone.service';
import { ZoneResolver } from '../resolvers/zone.resolver';
import { Zone, ZoneSchema } from '../schemas/zone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Zone.name, schema: ZoneSchema }]),
  ],
  providers: [ZoneService, ZoneResolver],
  exports: [ZoneService],
})
export class ZoneModule {}
