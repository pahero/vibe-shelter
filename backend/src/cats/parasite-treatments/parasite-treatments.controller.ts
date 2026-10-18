import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, SessionAuthGuard } from "../../auth";
import { CreateParasiteTreatmentHandler } from "./create-parasite-treatment.handler";
import { DeleteParasiteTreatmentHandler } from "./delete-parasite-treatment.handler";
import { ListParasiteTreatmentsHandler } from "./list-parasite-treatments.handler";
import { CreateParasiteTreatmentDto, UpdateParasiteTreatmentDto } from "./parasite-treatment.dto";
import { UpdateParasiteTreatmentHandler } from "./update-parasite-treatment.handler";

type AuthenticatedUser = { id: string; isTest: boolean };

@Controller("api/cats")
@UseGuards(SessionAuthGuard)
export class ParasiteTreatmentsController {
  constructor(
    private readonly listTreatments: ListParasiteTreatmentsHandler,
    private readonly createTreatment: CreateParasiteTreatmentHandler,
    private readonly updateTreatment: UpdateParasiteTreatmentHandler,
    private readonly deleteTreatment: DeleteParasiteTreatmentHandler,
  ) {}

  @Get(":id/parasite-treatments")
  list(@Param("id") catId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.listTreatments.handle(catId, user.isTest);
  }

  @Post(":id/parasite-treatments")
  @HttpCode(HttpStatus.CREATED)
  create(@Param("id") catId: string, @Body() dto: CreateParasiteTreatmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.createTreatment.handle(catId, dto.toCommand(), user.id, user.isTest);
  }

  @Patch("parasite-treatments/:treatmentId")
  update(@Param("treatmentId") id: string, @Body() dto: UpdateParasiteTreatmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.updateTreatment.handle(id, dto.toCommand(), user.id, user.isTest);
  }

  @Delete("parasite-treatments/:treatmentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("treatmentId") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.deleteTreatment.handle(id, user.id, user.isTest);
  }
}
