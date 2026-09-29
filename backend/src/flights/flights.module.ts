import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { AssignCatToFlightHandler } from "./commands/assign-cat-to-flight.handler";
import { CreateFlightHandler } from "./commands/create-flight.handler";
import { DeleteFlightCatAssignmentHandler } from "./commands/delete-flight-cat-assignment.handler";
import { DeleteFlightHandler } from "./commands/delete-flight.handler";
import { RestoreFlightCatAssignmentHandler } from "./commands/restore-flight-cat-assignment.handler";
import { RestoreFlightHandler } from "./commands/restore-flight.handler";
import { UpdateFlightCatAssignmentHandler } from "./commands/update-flight-cat-assignment.handler";
import { UpdateFlightHandler } from "./commands/update-flight.handler";
import { FlightsController } from "./flights.controller";
import { GetFlightHandler } from "./queries/get-flight.handler";
import { ListFlightHistoryHandler } from "./queries/list-flight-history.handler";
import { ListFlightsHandler } from "./queries/list-flights.handler";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [FlightsController],
  providers: [
    AssignCatToFlightHandler,
    CreateFlightHandler,
    DeleteFlightCatAssignmentHandler,
    DeleteFlightHandler,
    GetFlightHandler,
    ListFlightHistoryHandler,
    ListFlightsHandler,
    RestoreFlightCatAssignmentHandler,
    RestoreFlightHandler,
    UpdateFlightCatAssignmentHandler,
    UpdateFlightHandler,
  ],
})
export class FlightsModule {}
