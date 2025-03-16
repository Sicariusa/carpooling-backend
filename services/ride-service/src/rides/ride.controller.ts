import { Controller, Get, Post, Patch, Param, Body, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { RideService } from './ride.service';

@Controller('rides')
export class RideController {
  private readonly logger = new Logger(RideController.name);
  
  constructor(private readonly rideService: RideService) {}

  @Get(':id')
  async getRideById(@Param('id') id: string) {
    try {
      this.logger.log(`GET request for ride ${id}`);
      return await this.rideService.getRideById(id);
    } catch (error) {
      this.logger.error(`Error getting ride ${id}: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get ride: ${error.message}`);
    }
  }

  @Patch(':id/seats')
  async updateAvailableSeats(
    @Param('id') id: string,
    @Body() data: { change: number }
  ) {
    try {
      this.logger.log(`PATCH request to update seats for ride ${id} with change: ${data.change}`);
      
      if (data.change === undefined) {
        throw new BadRequestException('Missing required parameter: change');
      }
      
      return await this.rideService.updateAvailableSeats(id, data.change);
    } catch (error) {
      this.logger.error(`Error updating seats for ride ${id}: ${error.message}`);
      
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update seats: ${error.message}`);
    }
  }
} 