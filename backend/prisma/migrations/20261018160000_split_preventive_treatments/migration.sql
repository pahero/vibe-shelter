ALTER TABLE "AuditEvent" DROP CONSTRAINT "AuditEvent_preventiveTreatmentId_fkey";
DROP INDEX "AuditEvent_preventiveTreatmentId_idx";
ALTER TABLE "AuditEvent" DROP COLUMN "preventiveTreatmentId";

DROP TABLE "CatPreventiveTreatment";
DROP TYPE "PreventiveTreatmentType";

CREATE TYPE "VaccinationType" AS ENUM ('CORE', 'RABIES', 'OTHER');
CREATE TYPE "ParasiteTreatmentType" AS ENUM ('FLEAS_TICKS', 'DEWORMING', 'COMBINED', 'OTHER');

CREATE TABLE "Vaccination" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "type" "VaccinationType" NOT NULL,
    "date" DATE NOT NULL,
    "nextDueDate" DATE,
    "vaccineName" TEXT,
    "deletedAt" TIMESTAMP(3),
    "concurrencyToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ParasiteTreatment" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "type" "ParasiteTreatmentType" NOT NULL,
    "date" DATE NOT NULL,
    "nextDueDate" DATE,
    "productName" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "concurrencyToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ParasiteTreatment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Vaccination_catId_date_idx" ON "Vaccination"("catId", "date");
CREATE INDEX "Vaccination_deletedAt_idx" ON "Vaccination"("deletedAt");
CREATE INDEX "ParasiteTreatment_catId_date_idx" ON "ParasiteTreatment"("catId", "date");
CREATE INDEX "ParasiteTreatment_deletedAt_idx" ON "ParasiteTreatment"("deletedAt");

ALTER TABLE "AuditEvent" ADD COLUMN "vaccinationId" TEXT;
ALTER TABLE "AuditEvent" ADD COLUMN "parasiteTreatmentId" TEXT;
CREATE INDEX "AuditEvent_vaccinationId_idx" ON "AuditEvent"("vaccinationId");
CREATE INDEX "AuditEvent_parasiteTreatmentId_idx" ON "AuditEvent"("parasiteTreatmentId");

ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ParasiteTreatment" ADD CONSTRAINT "ParasiteTreatment_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_vaccinationId_fkey" FOREIGN KEY ("vaccinationId") REFERENCES "Vaccination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_parasiteTreatmentId_fkey" FOREIGN KEY ("parasiteTreatmentId") REFERENCES "ParasiteTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
