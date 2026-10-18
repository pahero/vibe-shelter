ALTER TABLE "CatTreatment"
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "updatedByUserId" TEXT;

CREATE INDEX "CatTreatment_createdByUserId_idx" ON "CatTreatment"("createdByUserId");
CREATE INDEX "CatTreatment_updatedByUserId_idx" ON "CatTreatment"("updatedByUserId");

ALTER TABLE "CatTreatment"
ADD CONSTRAINT "CatTreatment_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CatTreatment"
ADD CONSTRAINT "CatTreatment_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
