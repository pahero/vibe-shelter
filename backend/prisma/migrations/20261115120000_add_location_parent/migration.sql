ALTER TABLE "Location" ADD COLUMN "parentId" TEXT;

ALTER TABLE "Location"
ADD CONSTRAINT "Location_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Location_parentId_idx" ON "Location"("parentId");
