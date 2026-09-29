import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { SessionAuthGuard } from "../../auth/guards/session-auth.guard";
import { CreateCatPreventiveTreatmentHandler } from "./create-cat-preventive-treatment.handler";
import { DeleteCatPreventiveTreatmentHandler } from "./delete-cat-preventive-treatment.handler";
import { ListCatPreventiveTreatmentsHandler } from "./list-cat-preventive-treatments.handler";
import { CreatePreventiveTreatmentDto, UpdatePreventiveTreatmentDto } from "./preventive-treatment.dto";
import { UpdateCatPreventiveTreatmentHandler } from "./update-cat-preventive-treatment.handler";
type AuthenticatedUser = { id: string; isTest: boolean };
@Controller("api/cats") @UseGuards(SessionAuthGuard)
export class CatPreventiveTreatmentsController { constructor(private readonly listTreatments: ListCatPreventiveTreatmentsHandler, private readonly createTreatment: CreateCatPreventiveTreatmentHandler, private readonly updateTreatment: UpdateCatPreventiveTreatmentHandler, private readonly deleteTreatment: DeleteCatPreventiveTreatmentHandler) {} @Get(":id/preventive-treatments") list(@Param("id") catId: string, @CurrentUser() user: AuthenticatedUser) { return this.listTreatments.handle(catId, user.isTest); } @Post(":id/preventive-treatments") @HttpCode(HttpStatus.CREATED) create(@Param("id") catId: string, @Body() dto: CreatePreventiveTreatmentDto, @CurrentUser() user: AuthenticatedUser) { return this.createTreatment.handle(catId, dto.toCommand(), user.id, user.isTest); } @Patch("preventive-treatments/:treatmentId") update(@Param("treatmentId") treatmentId: string, @Body() dto: UpdatePreventiveTreatmentDto, @CurrentUser() user: AuthenticatedUser) { return this.updateTreatment.handle(treatmentId, dto.toCommand(), user.id, user.isTest); } @Delete("preventive-treatments/:treatmentId") @HttpCode(HttpStatus.NO_CONTENT) async remove(@Param("treatmentId") treatmentId: string, @CurrentUser() user: AuthenticatedUser) { await this.deleteTreatment.handle(treatmentId, user.id, user.isTest); } }
