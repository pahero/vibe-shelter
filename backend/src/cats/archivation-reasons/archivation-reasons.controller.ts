import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { CreateCatArchivationReasonDto, UpdateCatArchivationReasonDto } from '../dto';
import { CreateArchivationReasonCommand } from './create-archivation-reason.command';
import { DeleteArchivationReasonCommand } from './delete-archivation-reason.command';
import { ListArchivationReasonsQuery } from './list-archivation-reasons.query';
import { UpdateArchivationReasonCommand } from './update-archivation-reason.command';

type AuthenticatedUser = { id: string };

@Controller('api/cats/archivation-reasons')
@UseGuards(SessionAuthGuard)
export class ArchivationReasonsController {
  constructor(
    private readonly listReasonsQuery: ListArchivationReasonsQuery,
    private readonly createReasonCommand: CreateArchivationReasonCommand,
    private readonly updateReasonCommand: UpdateArchivationReasonCommand,
    private readonly deleteReasonCommand: DeleteArchivationReasonCommand,
  ) {}

  @Get()
  async list() {
    return this.listReasonsQuery.execute();
  }

  @Post()
  async create(@Body() dto: CreateCatArchivationReasonDto, @CurrentUser() user: AuthenticatedUser) {
    return this.createReasonCommand.execute(dto.name, user.id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCatArchivationReasonDto, @CurrentUser() user: AuthenticatedUser) {
    return this.updateReasonCommand.execute(id, dto.name, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.deleteReasonCommand.execute(id, user.id);
  }
}
