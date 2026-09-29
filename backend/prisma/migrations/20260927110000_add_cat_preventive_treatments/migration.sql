ALTER TYPE "CatAuditEventType" ADD VALUE 'preventive_treatment_created';
ALTER TYPE "CatAuditEventType" ADD VALUE 'preventive_treatment_deleted';
ALTER TYPE "CatAuditEventType" ADD VALUE 'preventive_treatment_date_changed';
ALTER TYPE "CatAuditEventType" ADD VALUE 'preventive_treatment_name_changed';

CREATE TABLE "CatPreventiveTreatment" (
  "id" TEXT NOT NULL, "catId" TEXT NOT NULL, "date" DATE NOT NULL, "name" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3), "concurrencyToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatPreventiveTreatment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CatPreventiveTreatment_catId_date_idx" ON "CatPreventiveTreatment"("catId", "date");
CREATE INDEX "CatPreventiveTreatment_deletedAt_idx" ON "CatPreventiveTreatment"("deletedAt");
ALTER TABLE "CatPreventiveTreatment" ADD CONSTRAINT "CatPreventiveTreatment_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
