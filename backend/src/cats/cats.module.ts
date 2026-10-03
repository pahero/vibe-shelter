import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { SessionAuthGuard } from "../auth";
import { DatabaseModule } from "../database/database.module";
import { CatPhotoUrlService } from "./cat-photo-url.service";
import { CatPhotoCleanupService } from "./cat-photo-cleanup.service";
import { CatsController } from "./cats.controller";
import { CreateCatHandler } from "./commands/create-cat.handler";
import { ArchiveCatHandler } from "./commands/archive-cat.handler";
import { DearchiveCatHandler } from "./commands/dearchive-cat.handler";
import { WriteCatAuditEventCommand } from "./commands/write-cat-audit-event.command";
import { ListCatHistoryQuery } from "./queries/list-cat-history.query";
import { ListAllCatHistoryQuery } from "./queries/list-all-cat-history.query";
import { ListFlightCandidatesHandler } from "./queries/list-flight-candidates.handler";
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
import { RestoreCatTreatmentHandler } from "./treatments/restore-cat-treatment.handler";
import { CatMedicalNotesController } from "./medical-notes/cat-medical-notes.controller";
import { CreateCatMedicalNoteHandler } from "./medical-notes/create-cat-medical-note.handler";
import { DeleteCatMedicalNoteHandler } from "./medical-notes/delete-cat-medical-note.handler";
import { ListCatMedicalNotesHandler } from "./medical-notes/list-cat-medical-notes.handler";
import { UpdateCatMedicalNoteHandler } from "./medical-notes/update-cat-medical-note.handler";
import { CatPreventiveTreatmentsController } from "./preventive-treatments/cat-preventive-treatments.controller";
import { CreateCatPreventiveTreatmentHandler } from "./preventive-treatments/create-cat-preventive-treatment.handler";
import { DeleteCatPreventiveTreatmentHandler } from "./preventive-treatments/delete-cat-preventive-treatment.handler";
import { ListCatPreventiveTreatmentsHandler } from "./preventive-treatments/list-cat-preventive-treatments.handler";
import { UpdateCatPreventiveTreatmentHandler } from "./preventive-treatments/update-cat-preventive-treatment.handler";
import { CatNotesController } from "./notes/cat-notes.controller";
import { CreateCatNoteHandler } from "./notes/create-cat-note.handler";
import { DeleteCatNoteHandler } from "./notes/delete-cat-note.handler";
import { ListCatNotesHandler } from "./notes/list-cat-notes.handler";
import { UpdateCatNoteHandler } from "./notes/update-cat-note.handler";
import { ListCatsHandler } from "./queries/list-cats.handler";
import { ListCatTagsHandler } from "./queries/list-cat-tags.handler";
import { GetCatCardHandler } from "./queries/get-cat-card.handler";
import { ListCatWeightsHandler } from "./queries/list-cat-weights.handler";
import { ListCatPhotosHandler } from "./queries/list-cat-photos.handler";
import { ListCatDocumentsHandler } from "./queries/list-cat-documents.handler";
import { UpdateCatHandler } from "./commands/update-cat.handler";
import { UpdateCatNameNumberHandler } from "./commands/update-cat-name-number.handler";
import { CreateCatTagHandler } from "./commands/create-cat-tag.handler";
import { UpdateCatTagHandler } from "./commands/update-cat-tag.handler";
import { DeleteCatTagHandler } from "./commands/delete-cat-tag.handler";
import { AddCatTagHandler } from "./commands/add-cat-tag.handler";
import { RemoveCatTagHandler } from "./commands/remove-cat-tag.handler";
import { AddCatWeightHandler } from "./commands/add-cat-weight.handler";
import { DeleteCatWeightHandler } from "./commands/delete-cat-weight.handler";
import { AddCatPhotoHandler } from "./commands/add-cat-photo.handler";
import { UpdatePrimaryCatPhotoHandler } from "./commands/update-primary-cat-photo.handler";
import { SetPrimaryCatPhotoHandler } from "./commands/set-primary-cat-photo.handler";
import { DeleteCatPhotoHandler } from "./commands/delete-cat-photo.handler";
import { AddCatDocumentHandler } from "./commands/add-cat-document.handler";
import { DeleteCatDocumentHandler } from "./commands/delete-cat-document.handler";

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule],
  controllers: [
    ArchivationReasonsController,
    CatsController,
    CatTasksController,
    TaskNotificationsController,
    CatTreatmentsController,
    CatMedicalNotesController,
    CatPreventiveTreatmentsController,
    CatNotesController,
  ],
  providers: [
    CatPhotoUrlService,
    CatPhotoCleanupService,
    CreateCatHandler,
    ArchiveCatHandler,
    DearchiveCatHandler,
    WriteCatAuditEventCommand,
    ListCatHistoryQuery,
    ListAllCatHistoryQuery,
    ListFlightCandidatesHandler,
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
    RestoreCatTreatmentHandler,
    SetCatTreatmentAdministrationHandler,
    ListCatMedicalNotesHandler,
    CreateCatMedicalNoteHandler,
    UpdateCatMedicalNoteHandler,
    DeleteCatMedicalNoteHandler,
    ListCatPreventiveTreatmentsHandler,
    CreateCatPreventiveTreatmentHandler,
    UpdateCatPreventiveTreatmentHandler,
    DeleteCatPreventiveTreatmentHandler,
    ListCatNotesHandler,
    CreateCatNoteHandler,
    UpdateCatNoteHandler,
    DeleteCatNoteHandler,
    ListCatsHandler,
    ListCatTagsHandler,
    GetCatCardHandler,
    ListCatWeightsHandler,
    ListCatPhotosHandler,
    ListCatDocumentsHandler,
    UpdateCatHandler,
    UpdateCatNameNumberHandler,
    CreateCatTagHandler,
    UpdateCatTagHandler,
    DeleteCatTagHandler,
    AddCatTagHandler,
    RemoveCatTagHandler,
    AddCatWeightHandler,
    DeleteCatWeightHandler,
    AddCatPhotoHandler,
    UpdatePrimaryCatPhotoHandler,
    SetPrimaryCatPhotoHandler,
    DeleteCatPhotoHandler,
    AddCatDocumentHandler,
    DeleteCatDocumentHandler,
    SessionAuthGuard,
  ],
})
export class CatsModule {}
