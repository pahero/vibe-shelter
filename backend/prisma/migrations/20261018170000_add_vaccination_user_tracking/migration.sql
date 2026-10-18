ALTER TABLE "Vaccination"
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "updatedByUserId" TEXT;

CREATE INDEX "Vaccination_createdByUserId_idx" ON "Vaccination"("createdByUserId");
CREATE INDEX "Vaccination_updatedByUserId_idx" ON "Vaccination"("updatedByUserId");

ALTER TABLE "Vaccination"
ADD CONSTRAINT "Vaccination_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Vaccination"
ADD CONSTRAINT "Vaccination_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
