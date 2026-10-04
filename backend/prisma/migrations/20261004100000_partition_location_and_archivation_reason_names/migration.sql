DROP INDEX IF EXISTS "Location_active_name_key";
CREATE UNIQUE INDEX "Location_active_name_isTest_key"
ON "Location"("name", "isTest")
WHERE "deletedAt" IS NULL;

ALTER TABLE "CatArchivationReason"
ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "CatArchivationReason_active_name_key";
CREATE INDEX "CatArchivationReason_isTest_idx"
ON "CatArchivationReason"("isTest");

CREATE UNIQUE INDEX "CatArchivationReason_active_name_isTest_key"
ON "CatArchivationReason"("name", "isTest")
WHERE "deletedAt" IS NULL;
