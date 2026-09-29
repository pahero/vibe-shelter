import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import configuration from "./config/configuration";
import { AppController } from "./app.controller";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { AdminModule } from "./admin/admin.module";
import { LocationsModule } from "./locations/locations.module";
import { CatsModule } from "./cats/cats.module";
import { FlightsModule } from "./flights/flights.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
      envFilePath: ".env",
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    AdminModule,
    LocationsModule,
    CatsModule,
    FlightsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
