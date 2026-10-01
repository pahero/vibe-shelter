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
import { CurrentUser, SessionAuthGuard } from "../auth";
import { AssignCatToFlightHandler } from "./commands/assign-cat-to-flight.handler";
import { CreateFlightHandler } from "./commands/create-flight.handler";
import { DeleteFlightCatAssignmentHandler } from "./commands/delete-flight-cat-assignment.handler";
import { DeleteFlightHandler } from "./commands/delete-flight.handler";
import { RestoreFlightCatAssignmentHandler } from "./commands/restore-flight-cat-assignment.handler";
import { RestoreFlightHandler } from "./commands/restore-flight.handler";
import { UpdateFlightCatAssignmentHandler } from "./commands/update-flight-cat-assignment.handler";
import { UpdateFlightHandler } from "./commands/update-flight.handler";
import {
  AssignCatToFlightDto,
  UpdateFlightCatAssignmentDto,
} from "./dto/flight-assignment.dto";
import { CreateFlightDto, UpdateFlightDto } from "./dto/flight.dto";
import { GetFlightHandler } from "./queries/get-flight.handler";
import { ListFlightHistoryHandler } from "./queries/list-flight-history.handler";
import { ListFlightsHandler } from "./queries/list-flights.handler";

type AuthenticatedUser = { id: string; isTest: boolean };

@Controller("api/flights")
@UseGuards(SessionAuthGuard)
export class FlightsController {
  constructor(
    private readonly createFlight: CreateFlightHandler,
    private readonly updateFlight: UpdateFlightHandler,
    private readonly deleteFlight: DeleteFlightHandler,
    private readonly restoreFlight: RestoreFlightHandler,
    private readonly assignCat: AssignCatToFlightHandler,
    private readonly updateAssignment: UpdateFlightCatAssignmentHandler,
    private readonly deleteAssignment: DeleteFlightCatAssignmentHandler,
    private readonly restoreAssignment: RestoreFlightCatAssignmentHandler,
    private readonly listFlights: ListFlightsHandler,
    private readonly getFlight: GetFlightHandler,
    private readonly listHistory: ListFlightHistoryHandler,
  ) {}

  @Get("deleted")
  listDeleted(@CurrentUser() user: AuthenticatedUser) {
    return this.listFlights.handle(user.isTest, true);
  }

  @Get(":id/history")
  listFlightHistory(
    @Param("id") flightId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.listHistory.handle(flightId, user.isTest);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.listFlights.handle(user.isTest, false);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateFlightDto, @CurrentUser() user: AuthenticatedUser) {
    return this.createFlight.handle(dto.toCommand(user.id, user.isTest));
  }

  @Get(":id")
  get(@Param("id") flightId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.getFlight.handle(flightId, user.isTest);
  }

  @Patch(":id")
  update(
    @Param("id") flightId: string,
    @Body() dto: UpdateFlightDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateFlight.handle(
      dto.toCommand(flightId, user.id, user.isTest),
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id") flightId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.deleteFlight.handle(flightId, user.id, user.isTest);
  }

  @Post(":id/restore")
  restore(
    @Param("id") flightId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.restoreFlight.handle(flightId, user.id, user.isTest);
  }

  @Post(":id/cats")
  @HttpCode(HttpStatus.CREATED)
  assign(
    @Param("id") flightId: string,
    @Body() dto: AssignCatToFlightDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignCat.handle(dto.toCommand(flightId, user.id, user.isTest));
  }

  @Patch("assignments/:assignmentId")
  updateCatAssignment(
    @Param("assignmentId") assignmentId: string,
    @Body() dto: UpdateFlightCatAssignmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.updateAssignment.handle(
      dto.toCommand(assignmentId, user.id, user.isTest),
    );
  }

  @Delete("assignments/:assignmentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCatAssignment(
    @Param("assignmentId") assignmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.deleteAssignment.handle(assignmentId, user.id, user.isTest);
  }

  @Post("assignments/:assignmentId/restore")
  restoreCatAssignment(
    @Param("assignmentId") assignmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.restoreAssignment.handle(assignmentId, user.id, user.isTest);
  }
}
