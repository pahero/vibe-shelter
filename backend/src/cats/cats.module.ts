import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../database/database.module";
import { CatPhotoUrlService } from "./cat-photo-url.service";
import { CatPhotoCleanupService } from "./cat-photo-cleanup.service";
import { CatsController } from "./cats.controller";
import { CatsService } from "./cats.service";
import { CreateCatHandler } from "./commands/create-cat.handler";
import { ArchiveCatHandler } from "./commands/archive-cat.handler";
import { DearchiveCatHandler } from "./commands/dearchive-cat.handler";
import { WriteCatAuditEventCommand } from "./commands/write-cat-audit-event.command";
import { ListCatHistoryQuery } from "./queries/list-cat-history.query";
import { ListAllCatHistoryQuery } from "./queries/list-all-cat-history.query";
import { ArchivationReasonsController } from "./archivation-reasons/archivation-reasons.controller";
import { CreateArchivationReasonCommand } from "./archivation-reasons/create-archivation-reason.command";
import { DeleteArchivationReasonCommand } from "./archivation-reasons/delete-archivation-reason.command";
import { ListArchivationReasonsQuery } from "./archivation-reasons/list-archivation-reasons.query";
import { UpdateArchivationReasonCommand } from "./archivation-reasons/update-archivation-reason.command";
import { CompleteCatTaskHandler } from "./tasks/complete-cat-task.handler";
import { CreateCatTaskHandler } from "./tasks/create-cat-task.handler";
import { DeleteCatTaskHandler } from "./tasks/delete-cat-task.handler";
import { ListCatTasksHandler } from "./tasks/list-cat-tasks.handler";
import { UpdateCatTaskHandler } from "./tasks/update-cat-task.handler";
import { SendDueTaskNotificationsHandler } from "./tasks/send-due-task-notifications.handler";
import { TaskNotificationCronService } from "./tasks/task-notification-cron.service";
import { ListCurrentUserNotificationsQuery } from "./tasks/list-current-user-notifications.query";
import { TaskNotificationsController } from "./tasks/task-notifications.controller";
import { CatTasksController } from "./tasks/cat-tasks.controller";
import { CatTreatmentsController } from "./treatments/cat-treatments.controller";
import { CreateCatTreatmentHandler } from "./treatments/create-cat-treatment.handler";
import { DeleteCatTreatmentHandler } from "./treatments/delete-cat-treatment.handler";
import { ListCatTreatmentsHandler } from "./treatments/list-cat-treatments.handler";
import { SetCatTreatmentAdministrationHandler } from "./treatments/set-cat-treatment-administration.handler";
import { UpdateCatTreatmentHandler } from "./treatments/update-cat-treatment.handler";

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule],
  controllers: [
    ArchivationReasonsController,
    CatsController,
    CatTasksController,
    TaskNotificationsController,
    CatTreatmentsController,
  ],
  providers: [
    CatsService,
    CatPhotoUrlService,
    CatPhotoCleanupService,
    CreateCatHandler,
    ArchiveCatHandler,
    DearchiveCatHandler,
    WriteCatAuditEventCommand,
    ListCatHistoryQuery,
    ListAllCatHistoryQuery,
    ListArchivationReasonsQuery,
    CreateArchivationReasonCommand,
    UpdateArchivationReasonCommand,
    DeleteArchivationReasonCommand,
    ListCatTasksHandler,
    CreateCatTaskHandler,
    UpdateCatTaskHandler,
    DeleteCatTaskHandler,
    CompleteCatTaskHandler,
    SendDueTaskNotificationsHandler,
    TaskNotificationCronService,
    ListCurrentUserNotificationsQuery,
    ListCatTreatmentsHandler,
    CreateCatTreatmentHandler,
    DeleteCatTreatmentHandler,
    UpdateCatTreatmentHandler,
    SetCatTreatmentAdministrationHandler,
  ],
  exports: [CatsService],
})
export class CatsModule {}
