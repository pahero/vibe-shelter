import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser, SessionAuthGuard } from "../../auth";
import {
  CreateCatArchivingReasonDto,
  DeleteCatArchivingReasonDto,
  UpdateCatArchivingReasonDto,
} from "../dto";
import { CreateArchivingReasonCommand } from "./create-archiving-reason.command";
import { DeleteArchivingReasonCommand } from "./delete-archiving-reason.command";
import { ListArchivingReasonsQuery } from "./list-archiving-reasons.query";
import { UpdateArchivingReasonCommand } from "./update-archiving-reason.command";

type AuthenticatedUser = { id: string; isTest: boolean };

@Controller("api/cats/archiving-reasons")
@UseGuards(SessionAuthGuard)
export class ArchivingReasonsController {
  constructor(
    private readonly listReasonsQuery: ListArchivingReasonsQuery,
    private readonly createReasonCommand: CreateArchivingReasonCommand,
    private readonly updateReasonCommand: UpdateArchivingReasonCommand,
    private readonly deleteReasonCommand: DeleteArchivingReasonCommand,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.listReasonsQuery.execute(user.isTest);
  }

  @Post()
  async create(
    @Body() dto: CreateCatArchivingReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createReasonCommand.execute(dto.name, user.id, user.isTest);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCatArchivingReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateReasonCommand.execute(id, dto.name, user.id, user.isTest);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param("id") id: string,
    @Body() dto: DeleteCatArchivingReasonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.deleteReasonCommand.execute(
      id,
      user.id,
      dto.replacementReasonId,
      user.isTest,
    );
  }
}
