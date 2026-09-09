-- Soft delete for tags: keep history rows, allow reusable names among deleted tags.
ALTER TABLE "CatTag" ADD COLUMN "deletedAt" TIMESTAMP(3);
DROP INDEX IF EXISTS "CatTag_name_key";
CREATE UNIQUE INDEX "CatTag_active_name_key" ON "CatTag"("name") WHERE "deletedAt" IS NULL;
CREATE INDEX "CatTag_deletedAt_idx" ON "CatTag"("deletedAt");