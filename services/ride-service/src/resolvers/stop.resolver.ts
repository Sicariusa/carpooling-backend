import { Resolver, Query, Mutation, Args, ID, ResolveField, Parent, Float } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Stop } from '../schemas/stop.schema';
import { StopService } from '../services/stop.service';
import { CreateStopInput, UpdateStopInput } from '../dto/stop.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RoleGuard } from '../guards/role.guard';
import { Roles } from '../decorators/roles.decorator';
import { Zone } from '../schemas/zone.schema';

@Resolver(() => Stop)
export class StopResolver {
  constructor(private stopService: StopService) {}

  @Query(() => [Stop])
  async stops() {
    return this.stopService.findAll();
  }

  @Query(() => Stop)
  async stop(@Args('id', { type: () => ID }) id: string) {
    return this.stopService.findById(id);
  }

  @Query(() => [Stop])
  async stopsByZone(@Args('zoneId', { type: () => ID }) zoneId: string) {
    return this.stopService.findByZone(zoneId);
  }

  @Query(() => [Stop])
  async searchStops(@Args('query', { type: () => String }) query: string) {
    return this.stopService.search(query);
  }

  @Mutation(() => Stop)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('ADMIN')
  async createStop(@Args('input') input: CreateStopInput) {
    return this.stopService.create(input);
  }

  @Mutation(() => Stop)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('ADMIN')
  async updateStop(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateStopInput
  ) {
    return this.stopService.update(id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('ADMIN')
  async removeStop(@Args('id', { type: () => ID }) id: string) {
    return this.stopService.remove(id);
  }

  @ResolveField(() => Zone)
  async zone(@Parent() stop: Stop) {
    return this.stopService.getZoneForStop(stop._id.toString());
  }

  // Find the closest stop to a given coordinate
  @Query(() => Stop)
  async closestStop(@Args('latitude', { type: () => Float }) latitude: number,
    @Args('longitude', { type: () => Float }) longitude: number
  ) {
    return this.stopService.findClosestStop(latitude, longitude);
  }
}