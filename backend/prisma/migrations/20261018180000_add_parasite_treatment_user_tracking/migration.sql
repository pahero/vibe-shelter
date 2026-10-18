ALTER TABLE "ParasiteTreatment"
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "updatedByUserId" TEXT;

CREATE INDEX "ParasiteTreatment_createdByUserId_idx" ON "ParasiteTreatment"("createdByUserId");
CREATE INDEX "ParasiteTreatment_updatedByUserId_idx" ON "ParasiteTreatment"("updatedByUserId");

ALTER TABLE "ParasiteTreatment"
ADD CONSTRAINT "ParasiteTreatment_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ParasiteTreatment"
ADD CONSTRAINT "ParasiteTreatment_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
