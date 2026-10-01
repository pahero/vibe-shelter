// src/locations/locations.module.ts
import { Module } from "@nestjs/common";
import { LocationsController } from "./locations.controller";
import { DatabaseModule } from "../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { SessionAuthGuard } from "../auth";
import { CreateLocationHandler } from "./commands/create-location.handler";
import { UpdateLocationHandler } from "./commands/update-location.handler";
import { ArchiveLocationHandler } from "./commands/archive-location.handler";
import { GetLocationHandler } from "./queries/get-location.handler";
import { ListLocationsHandler } from "./queries/list-locations.handler";
import { ListLocationsQueryDto } from "./dto/list-locations-query.dto";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [LocationsController],
  providers: [
    CreateLocationHandler,
    UpdateLocationHandler,
    ArchiveLocationHandler,
    GetLocationHandler,
    ListLocationsHandler,
    ListLocationsQueryDto,
    SessionAuthGuard,
  ],
})
export class LocationsModule {}
