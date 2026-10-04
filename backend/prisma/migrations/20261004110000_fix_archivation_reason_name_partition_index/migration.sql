DROP INDEX IF EXISTS "CatArchivationReason_active_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "CatArchivationReason_active_name_isTest_key"
ON "CatArchivationReason"("name", "isTest")
WHERE "deletedAt" IS NULL;
