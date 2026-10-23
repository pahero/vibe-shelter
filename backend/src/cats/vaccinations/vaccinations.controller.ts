import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, JwtAuthGuard } from "../../auth";
import { CreateVaccinationHandler } from "./create-vaccination.handler";
import { DeleteVaccinationHandler } from "./delete-vaccination.handler";
import { ListVaccinationsHandler } from "./list-vaccinations.handler";
import { CreateVaccinationDto, UpdateVaccinationDto } from "./vaccination.dto";
import { UpdateVaccinationHandler } from "./update-vaccination.handler";

type AuthenticatedUser = { id: string; isTest: boolean };

@Controller("api/cats")
@UseGuards(JwtAuthGuard)
export class VaccinationsController {
  constructor(
    private readonly listVaccinations: ListVaccinationsHandler,
    private readonly createVaccination: CreateVaccinationHandler,
    private readonly updateVaccination: UpdateVaccinationHandler,
    private readonly deleteVaccination: DeleteVaccinationHandler,
  ) {}

  @Get(":id/vaccinations")
  list(@Param("id") catId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.listVaccinations.handle(catId, user.isTest);
  }

  @Post(":id/vaccinations")
  @HttpCode(HttpStatus.CREATED)
  create(@Param("id") catId: string, @Body() dto: CreateVaccinationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.createVaccination.handle(catId, dto.toCommand(), user.id, user.isTest);
  }

  @Patch("vaccinations/:vaccinationId")
  update(@Param("vaccinationId") id: string, @Body() dto: UpdateVaccinationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.updateVaccination.handle(id, dto.toCommand(), user.id, user.isTest);
  }

  @Delete("vaccinations/:vaccinationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("vaccinationId") id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.deleteVaccination.handle(id, user.id, user.isTest);
  }
}
