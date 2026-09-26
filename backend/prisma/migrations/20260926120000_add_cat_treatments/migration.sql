-- Treatments and their individually recorded administrations.
CREATE TYPE "CatAuditEventType_new" AS ENUM (
  'cat_created', 'cat_archived', 'cat_dearchived',
  'archivation_reason_create', 'archivation_reason_update', 'archivation_reason_delete',
  'name_changed', 'sex_changed', 'color_changed', 'estimated_birth_date_changed',
  'intake_date_changed', 'rescue_source_changed', 'microchip_number_changed', 'passport_number_changed',
  'sterilization_status_changed', 'status_changed', 'current_location_changed',
  'photo_created', 'photo_deleted', 'document_created', 'document_deleted', 'weight_created', 'weight_deleted',
  'tag_added_to_cat', 'tag_removed_from_cat', 'task_created', 'task_updated', 'task_comment_changed',
  'task_due_date_changed', 'task_receivers_changed', 'task_deleted', 'task_completed',
  'treatment_short_name_changed', 'treatment_start_date_changed', 'treatment_end_date_changed',
  'treatment_doses_per_day_changed', 'treatment_instructions_changed',
  'treatment_administration_checked', 'treatment_administration_unchecked'
);
ALTER TABLE "CatAuditEvent" ALTER COLUMN "eventType" TYPE "CatAuditEventType_new" USING ("eventType"::text::"CatAuditEventType_new");
ALTER TYPE "CatAuditEventType" RENAME TO "CatAuditEventType_old";
ALTER TYPE "CatAuditEventType_new" RENAME TO "CatAuditEventType";
DROP TYPE "CatAuditEventType_old";

CREATE TABLE "CatTreatment" (
  "id" TEXT NOT NULL,
  "catId" TEXT NOT NULL,
  "shortName" TEXT NOT NULL,
  "instructions" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE,
  "dosesPerDay" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatTreatment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CatTreatment_dosesPerDay_check" CHECK ("dosesPerDay" BETWEEN 1 AND 2),
  CONSTRAINT "CatTreatment_dates_check" CHECK ("endDate" IS NULL OR "endDate" >= "startDate")
);
CREATE INDEX "CatTreatment_catId_createdAt_idx" ON "CatTreatment"("catId", "createdAt");
CREATE INDEX "CatTreatment_catId_startDate_endDate_idx" ON "CatTreatment"("catId", "startDate", "endDate");
ALTER TABLE "CatTreatment" ADD CONSTRAINT "CatTreatment_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CatTreatmentAdministration" (
  "treatmentId" TEXT NOT NULL,
  "administeredOn" DATE NOT NULL,
  "doseNumber" INTEGER NOT NULL,
  "checkedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CatTreatmentAdministration_pkey" PRIMARY KEY ("treatmentId", "administeredOn", "doseNumber"),
  CONSTRAINT "CatTreatmentAdministration_doseNumber_check" CHECK ("doseNumber" BETWEEN 1 AND 2)
);
CREATE INDEX "CatTreatmentAdministration_checkedByUserId_idx" ON "CatTreatmentAdministration"("checkedByUserId");
CREATE INDEX "CatTreatmentAdministration_treatmentId_administeredOn_idx" ON "CatTreatmentAdministration"("treatmentId", "administeredOn");
ALTER TABLE "CatTreatmentAdministration" ADD CONSTRAINT "CatTreatmentAdministration_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "CatTreatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatTreatmentAdministration" ADD CONSTRAINT "CatTreatmentAdministration_checkedByUserId_fkey" FOREIGN KEY ("checkedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
