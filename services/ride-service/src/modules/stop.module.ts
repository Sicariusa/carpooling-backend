import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StopService } from '../services/stop.service';
import { Stop, StopSchema } from '../schemas/stop.schema';
import { ZoneModule } from './zone.module';
import { Route, RouteSchema } from '../schemas/route.schema';
import { StopResolver } from '../resolvers/stop.resolver';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Stop.name, schema: StopSchema },
      { name: Route.name, schema: RouteSchema }
    ]),
    forwardRef(() => ZoneModule),
  ],
  providers: [StopService, StopResolver],
  exports: [StopService],
})
export class StopModule {} 