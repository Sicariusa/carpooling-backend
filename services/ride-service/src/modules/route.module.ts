import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Route, RouteSchema } from '../schemas/route.schema';
import { RouteService } from '../services/route.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Route.name, schema: RouteSchema }])],
  providers: [RouteService],
  exports: [RouteService],
})
export class RouteModule {}
