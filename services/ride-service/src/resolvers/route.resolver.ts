import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent } from '@nestjs/graphql';
import { Route, RouteStop } from '../schemas/route.schema';
import { Stop } from '../schemas/stop.schema';
import { RouteService } from '../services/route.service';
import { CreateRouteInput, UpdateRouteInput } from '../dto/route.dto';
import { UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { AuthGuard } from '../guards/auth.guard';
import { RoleGuard } from '../guards/role.guard';

@Resolver(() => Route)
export class RouteResolver {
  constructor(private routeService: RouteService) {}

  @Query(() => [Route])
  async routes() {
    return this.routeService.findAll();
  }

  @Query(() => Route)
  async route(@Args('id', { type: () => ID }) id: string) {
    return this.routeService.findById(id);
  }

  @Mutation(() => Route)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('ADMIN')
  async createRoute(@Args('input') input: CreateRouteInput) {
    return this.routeService.create(input);
  }

  @Mutation(() => Route)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('ADMIN')
  async updateRoute(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateRouteInput,
  ) {
    return this.routeService.update(id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('ADMIN')
  async removeRoute(@Args('id', { type: () => ID }) id: string) {
    return this.routeService.remove(id);
  }

  @ResolveField(() => [Stop])
  async stops(@Parent() route: Route) {
    return this.routeService.getStopsForRoute(route._id.toString());
  }
}
