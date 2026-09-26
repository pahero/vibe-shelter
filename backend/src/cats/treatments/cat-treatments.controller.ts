import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../auth/guards/session-auth.guard";
import { CreateCatTreatmentHandler } from "./create-cat-treatment.handler";
import { DeleteCatTreatmentHandler } from "./delete-cat-treatment.handler";
import { ListCatTreatmentsHandler } from "./list-cat-treatments.handler";
import { SetCatTreatmentAdministrationHandler } from "./set-cat-treatment-administration.handler";
import { CreateTreatmentDto, SetTreatmentAdministrationDto, UpdateTreatmentDto } from "./treatment.dto";
import { UpdateCatTreatmentHandler } from "./update-cat-treatment.handler";

type AuthenticatedUser = { id: string; isTest: boolean };

@Controller("api/cats")
@UseGuards(SessionAuthGuard)
export class CatTreatmentsController {
  constructor(private readonly listTreatments: ListCatTreatmentsHandler, private readonly createTreatment: CreateCatTreatmentHandler, private readonly updateTreatment: UpdateCatTreatmentHandler, private readonly deleteTreatment: DeleteCatTreatmentHandler, private readonly setAdministration: SetCatTreatmentAdministrationHandler) {}

  @Get(":id/treatments")
  list(@Param("id") catId: string, @CurrentUser() user: AuthenticatedUser) { return this.listTreatments.handle(catId, user.isTest); }

  @Post(":id/treatments")
  @HttpCode(HttpStatus.CREATED)
  create(@Param("id") catId: string, @Body() dto: CreateTreatmentDto, @CurrentUser() user: AuthenticatedUser) { return this.createTreatment.handle(catId, dto.toCommand(), user.id, user.isTest); }

  @Patch("treatments/:treatmentId")
  update(@Param("treatmentId") treatmentId: string, @Body() dto: UpdateTreatmentDto, @CurrentUser() user: AuthenticatedUser) { return this.updateTreatment.handle(treatmentId, dto.toCommand(), user.id, user.isTest); }

  @Delete("treatments/:treatmentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("treatmentId") treatmentId: string, @CurrentUser() user: AuthenticatedUser) { await this.deleteTreatment.handle(treatmentId, user.id, user.isTest); }

  @Put("treatments/:treatmentId/administrations")
  administration(@Param("treatmentId") treatmentId: string, @Body() dto: SetTreatmentAdministrationDto, @CurrentUser() user: AuthenticatedUser) { return this.setAdministration.handle(treatmentId, dto.toCommand(), user.id, user.isTest); }
}
