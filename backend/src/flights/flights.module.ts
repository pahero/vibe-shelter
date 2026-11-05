import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CatsModule } from "../cats/cats.module";
import { JwtAuthGuard } from "../auth";
import { DatabaseModule } from "../database/database.module";
import { AssignCatToFlightHandler } from "./commands/assign-cat-to-flight.handler";
import { CreateFlightHandler } from "./commands/create-flight.handler";
import { DeleteFlightCatAssignmentHandler } from "./commands/delete-flight-cat-assignment.handler";
import { DeleteFlightHandler } from "./commands/delete-flight.handler";
import { AddFlightPhotoHandler } from "./commands/add-flight-photo.handler";
import { DeleteFlightPhotoHandler } from "./commands/delete-flight-photo.handler";
import { CatPhotoUrlService } from "../cats/cat-photo-url.service";
import { RestoreFlightCatAssignmentHandler } from "./commands/restore-flight-cat-assignment.handler";
import { RestoreFlightHandler } from "./commands/restore-flight.handler";
import { UpdateFlightCatAssignmentHandler } from "./commands/update-flight-cat-assignment.handler";
import { UpdateFlightHandler } from "./commands/update-flight.handler";
import { FlightsController } from "./flights.controller";
import { GetFlightHandler } from "./queries/get-flight.handler";
import { ListFlightsHandler } from "./queries/list-flights.handler";
import { ListFlightPhotosHandler } from "./queries/list-flight-photos.handler";

@Module({
  imports: [DatabaseModule, AuthModule, CatsModule],
  controllers: [FlightsController],
  providers: [
    AssignCatToFlightHandler,
    AddFlightPhotoHandler,
    CreateFlightHandler,
    DeleteFlightCatAssignmentHandler,
    DeleteFlightHandler,
    DeleteFlightPhotoHandler,
    GetFlightHandler,
    ListFlightsHandler,
    ListFlightPhotosHandler,
    RestoreFlightCatAssignmentHandler,
    RestoreFlightHandler,
    UpdateFlightCatAssignmentHandler,
    UpdateFlightHandler,
    JwtAuthGuard,
    CatPhotoUrlService,
  ],
})
export class FlightsModule {}
