ALTER TABLE "CatWeight"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "CatWeight_deletedAt_idx" ON "CatWeight"("deletedAt");

ALTER TABLE "CatTreatmentAdministration"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "CatTreatmentAdministration_deletedAt_idx"
ON "CatTreatmentAdministration"("deletedAt");
