import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { AdminRoleGuard, JwtAuthGuard } from "../auth";
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
import { ArchivingReasonsController } from "./archiving-reasons/archiving-reasons.controller";
import { CreateArchivingReasonCommand } from "./archiving-reasons/create-archiving-reason.command";
import { DeleteArchivingReasonCommand } from "./archiving-reasons/delete-archiving-reason.command";
import { ListArchivingReasonsQuery } from "./archiving-reasons/list-archiving-reasons.query";
import { UpdateArchivingReasonCommand } from "./archiving-reasons/update-archiving-reason.command";
import { CompleteCatTaskHandler } from "./tasks/complete-cat-task.handler";
import { CreateCatTaskHandler } from "./tasks/create-cat-task.handler";
import { DeleteCatTaskHandler } from "./tasks/delete-cat-task.handler";
import { ListCatTasksHandler } from "./tasks/list-cat-tasks.handler";
import { UpdateCatTaskHandler } from "./tasks/update-cat-task.handler";
import { SendDueTaskNotificationsHandler } from "./tasks/send-due-task-notifications.handler";
import { TaskNotificationCronService } from "./tasks/task-notification-cron.service";
import { ListCurrentUserNotificationsQuery } from "./tasks/list-current-user-notifications.query";
import { TaskNotificationsController } from "./tasks/task-notifications.controller";
import { DismissNotificationHandler } from "./tasks/dismiss-notification.handler";
import { CatTasksController } from "./tasks/cat-tasks.controller";
import { CatTreatmentsController } from "./treatments/cat-treatments.controller";
import { CreateCatTreatmentHandler } from "./treatments/create-cat-treatment.handler";
import { DeleteCatTreatmentHandler } from "./treatments/delete-cat-treatment.handler";
import { ListCatTreatmentsHandler } from "./treatments/list-cat-treatments.handler";
import { SetCatTreatmentAdministrationHandler } from "./treatments/set-cat-treatment-administration.handler";
import { UpdateCatTreatmentHandler } from "./treatments/update-cat-treatment.handler";
import { RestoreCatTreatmentHandler } from "./treatments/restore-cat-treatment.handler";
import { SendDueTreatmentNotificationsHandler } from "./treatments/send-due-treatment-notifications.handler";
import { CatMedicalNotesController } from "./medical-notes/cat-medical-notes.controller";
import { CreateCatMedicalNoteHandler } from "./medical-notes/create-cat-medical-note.handler";
import { DeleteCatMedicalNoteHandler } from "./medical-notes/delete-cat-medical-note.handler";
import { ListCatMedicalNotesHandler } from "./medical-notes/list-cat-medical-notes.handler";
import { UpdateCatMedicalNoteHandler } from "./medical-notes/update-cat-medical-note.handler";
import { VaccinationsController } from "./vaccinations/vaccinations.controller";
import { CreateVaccinationHandler } from "./vaccinations/create-vaccination.handler";
import { DeleteVaccinationHandler } from "./vaccinations/delete-vaccination.handler";
import { ListVaccinationsHandler } from "./vaccinations/list-vaccinations.handler";
import { UpdateVaccinationHandler } from "./vaccinations/update-vaccination.handler";
import { ParasiteTreatmentsController } from "./parasite-treatments/parasite-treatments.controller";
import { CreateParasiteTreatmentHandler } from "./parasite-treatments/create-parasite-treatment.handler";
import { DeleteParasiteTreatmentHandler } from "./parasite-treatments/delete-parasite-treatment.handler";
import { ListParasiteTreatmentsHandler } from "./parasite-treatments/list-parasite-treatments.handler";
import { UpdateParasiteTreatmentHandler } from "./parasite-treatments/update-parasite-treatment.handler";
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
import { SetCatFlightCandidateHandler } from "./commands/set-cat-flight-candidate.handler";
import { PushSubscriptionsController } from "./tasks/push-subscriptions.controller";
import { PushNotificationService } from "./tasks/push-notification.service";
import { ToggleCatFavoriteHandler } from "./commands/toggle-cat-favorite.handler";
import { ListFavoriteCatsWithActiveTreatmentsHandler } from "./queries/list-favorite-cats-with-active-treatments.handler";

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule],
  controllers: [
    ArchivingReasonsController,
    CatsController,
    CatTasksController,
    TaskNotificationsController,
    PushSubscriptionsController,
    CatTreatmentsController,
    CatMedicalNotesController,
    VaccinationsController,
    ParasiteTreatmentsController,
    CatNotesController,
  ],
  providers: [
    CatPhotoUrlService,
    CatPhotoCleanupService,
    ToggleCatFavoriteHandler,
    ListFavoriteCatsWithActiveTreatmentsHandler,
    CreateCatHandler,
    ArchiveCatHandler,
    DearchiveCatHandler,
    WriteCatAuditEventCommand,
    ListCatHistoryQuery,
    ListAllCatHistoryQuery,
    ListFlightCandidatesHandler,
    ListArchivingReasonsQuery,
    CreateArchivingReasonCommand,
    UpdateArchivingReasonCommand,
    DeleteArchivingReasonCommand,
    ListCatTasksHandler,
    CreateCatTaskHandler,
    UpdateCatTaskHandler,
    DeleteCatTaskHandler,
    CompleteCatTaskHandler,
    SendDueTaskNotificationsHandler,
    SendDueTreatmentNotificationsHandler,
    TaskNotificationCronService,
    ListCurrentUserNotificationsQuery,
    DismissNotificationHandler,
    PushNotificationService,
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
    ListVaccinationsHandler,
    CreateVaccinationHandler,
    UpdateVaccinationHandler,
    DeleteVaccinationHandler,
    ListParasiteTreatmentsHandler,
    CreateParasiteTreatmentHandler,
    UpdateParasiteTreatmentHandler,
    DeleteParasiteTreatmentHandler,
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
    SetCatFlightCandidateHandler,
    JwtAuthGuard,
    AdminRoleGuard,
  ],
})
export class CatsModule {}
