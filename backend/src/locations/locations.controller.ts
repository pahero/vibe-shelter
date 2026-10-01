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
import { CreateLocationDto, UpdateLocationDto } from './dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateLocationHandler } from './commands/create-location.handler';
import { UpdateLocationHandler } from './commands/update-location.handler';
import { ArchiveLocationHandler } from './commands/archive-location.handler';
import { GetLocationHandler } from './queries/get-location.handler';
import { ListLocationsHandler } from './queries/list-locations.handler';
import { ListLocationsQueryDto } from './dto/list-locations-query.dto';

type AuthenticatedUser = { id: string; isTest: boolean };

@Controller('api/locations')
@UseGuards(SessionAuthGuard)
export class LocationsController {
  constructor(
    private readonly createLocationHandler: CreateLocationHandler,
    private readonly updateLocationHandler: UpdateLocationHandler,
    private readonly archiveLocationHandler: ArchiveLocationHandler,
    private readonly getLocationHandler: GetLocationHandler,
  private readonly listLocationsHandler: ListLocationsHandler,
    private readonly listLocationsQueryDto: ListLocationsQueryDto,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLocation(@Body() dto: CreateLocationDto, @CurrentUser() user: AuthenticatedUser) {
    const command = dto.toCommand();
    return this.createLocationHandler.handle(command.name, command.description, command.ownerId, user.isTest, user.id);
  }

  @Get()
  async listLocations(
    @Query('ownerId') ownerId?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.listLocationsHandler.handle(this.listLocationsQueryDto.toQuery({
      ownerId,
      status,
      skip,
      limit,
    }), user?.isTest ?? false);
  }

  @Get(':id')
  async getLocation(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.getLocationHandler.handle(id, user.isTest);
  }

  @Patch(':id')
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateLocationHandler.handle(id, dto.toCommand(), user.isTest, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLocation(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.archiveLocationHandler.handle(id, user.isTest, user.id);
  }
}
