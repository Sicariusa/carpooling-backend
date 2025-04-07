import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { Zone } from '../schemas/zone.schema';
import { ZoneService } from '../services/zone.service';
import { CreateZoneInput, UpdateZoneInput } from '../dto/zone.dto';
import { UseGuards } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator';
import { AuthGuard } from '../guards/auth.guard';
import { RoleGuard } from '../guards/role.guard';

@Resolver(() => Zone)
export class ZoneResolver {
  constructor(private zoneService: ZoneService) {}

  @Query(() => [Zone])
  async zones() {
    return this.zoneService.findAll();
  }

  @Query(() => Zone)
  async zone(@Args('id', { type: () => ID }) id: string) {
    return this.zoneService.findById(id);
  }

  @Mutation(() => Zone)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('ADMIN')
  async createZone(@Args('input') input: CreateZoneInput) {
    return this.zoneService.create(input);
  }

  @Mutation(() => Zone)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('ADMIN')
  async updateZone(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateZoneInput,
  ) {
    return this.zoneService.update(id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(AuthGuard, RoleGuard)
  @Roles('ADMIN')
  async removeZone(@Args('id', { type: () => ID }) id: string) {
    return this.zoneService.remove(id);
  }
}
