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
  UseGuards,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { CreateLocationDto, UpdateLocationDto } from './dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/locations')
@UseGuards(SessionAuthGuard)
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLocation(@Body() dto: CreateLocationDto, @CurrentUser() user: Express.User) {
    return await this.locationsService.createLocation(dto, user);
  }

  @Get()
  async listLocations(
    @Query('ownerId') ownerId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.locationsService.findAll({
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
    @CurrentUser() user: Express.User,
  ) {
    return await this.locationsService.updateLocation(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLocation(@Param('id') id: string, @CurrentUser() user: Express.User) {
    await this.locationsService.archiveLocation(id, user);
  }
}
