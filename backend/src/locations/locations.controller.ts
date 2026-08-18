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

type AuthenticatedUser = { id: string; isTest: boolean };

@Controller('api/locations')
@UseGuards(SessionAuthGuard)
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLocation(@Body() dto: CreateLocationDto, @CurrentUser() user: AuthenticatedUser) {
    return await this.locationsService.createLocation(dto, user.isTest);
  }

  @Get()
  async listLocations(
    @Query('ownerId') ownerId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return await this.locationsService.findAll({
      ownerId,
      status,
      skip: skip ? parseInt(skip, 10) : 0,
      limit: limit ? parseInt(limit, 10) : 50,
    }, user?.isTest ?? false);
  }

  @Get(':id')
  async getLocation(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return await this.locationsService.findById(id, user.isTest);
  }

  @Patch(':id')
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return await this.locationsService.updateLocation(id, dto, user.isTest);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLocation(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.locationsService.archiveLocation(id, user.isTest);
  }
}
