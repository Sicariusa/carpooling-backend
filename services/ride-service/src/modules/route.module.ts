import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RouteService } from '../services/route.service';
import { RouteResolver } from '../resolvers/route.resolver';
import { Route, RouteSchema } from '../schemas/route.schema';
import { StopModule } from './stop.module';
import { ZoneModule } from './zone.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Route.name, schema: RouteSchema }]),
    StopModule,
    ZoneModule,
  ],
  providers: [RouteService, RouteResolver],
  exports: [RouteService],
})
export class RouteModule {}
