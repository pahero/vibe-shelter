DROP INDEX "CatTask_isTest_completedAt_dueDate_idx";
ALTER TABLE "CatTask" DROP COLUMN "isTest";
ALTER TABLE "CatTask" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "CatTask" ADD COLUMN "concurrencyToken" TEXT;
UPDATE "CatTask" SET "concurrencyToken" = md5(random()::text || clock_timestamp()::text || "id");
ALTER TABLE "CatTask" ALTER COLUMN "concurrencyToken" SET NOT NULL;
CREATE INDEX "CatTask_deletedAt_completedAt_dueDate_idx" ON "CatTask"("deletedAt", "completedAt", "dueDate");
CREATE INDEX "CatTask_deletedAt_idx" ON "CatTask"("deletedAt");
