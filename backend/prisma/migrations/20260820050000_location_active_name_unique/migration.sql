DROP INDEX IF EXISTS "Location_name_key";
CREATE UNIQUE INDEX "Location_active_name_key" ON "Location"("name") WHERE "deletedAt" IS NULL;
