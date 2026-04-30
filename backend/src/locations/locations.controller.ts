// src/locations/locations.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';

@Controller('api/locations')
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLocation(@Body() dto: CreateLocationDto) {
    return await this.locationsService.createLocation(dto);
  }

  @Get()
  async listLocations(
    @Query('type') type?: string,
    @Query('ownerId') ownerId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.locationsService.findAll({
      type,
      ownerId,
      status,
      skip: skip ? parseInt(skip, 10) : 0,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get(':id')
  async getLocation(@Param('id') id: string) {
    return await this.locationsService.findById(id);
  }

  @Patch(':id')
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return await this.locationsService.updateLocation(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLocation(@Param('id') id: string) {
    await this.locationsService.archiveLocation(id);
  }
}
