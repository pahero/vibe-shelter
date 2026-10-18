ALTER TABLE "CatTreatment" ADD COLUMN "notificationSent" BOOLEAN NOT NULL DEFAULT false;
UPDATE "CatTreatment" SET "notificationSent" = true;
CREATE INDEX "CatTreatment_notificationSent_startDate_idx" ON "CatTreatment"("notificationSent", "startDate");

ALTER TABLE "TaskNotification" ALTER COLUMN "taskId" DROP NOT NULL;
ALTER TABLE "TaskNotification" ADD COLUMN "treatmentId" TEXT;
CREATE UNIQUE INDEX "TaskNotification_treatmentId_userId_key" ON "TaskNotification"("treatmentId", "userId");
CREATE INDEX "TaskNotification_treatmentId_idx" ON "TaskNotification"("treatmentId");
ALTER TABLE "TaskNotification" ADD CONSTRAINT "TaskNotification_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "CatTreatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskNotification" ADD CONSTRAINT "TaskNotification_exactly_one_target_check" CHECK (("taskId" IS NOT NULL AND "treatmentId" IS NULL) OR ("taskId" IS NULL AND "treatmentId" IS NOT NULL));
