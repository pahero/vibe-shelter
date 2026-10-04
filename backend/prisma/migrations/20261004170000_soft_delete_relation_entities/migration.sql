ALTER TABLE "Session"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CatTagOnCat"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CatTaskReceiver"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "TaskNotification"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "CatTagOnCat_deletedAt_idx" ON "CatTagOnCat"("deletedAt");
CREATE INDEX "CatTaskReceiver_deletedAt_idx" ON "CatTaskReceiver"("deletedAt");
CREATE INDEX "TaskNotification_deletedAt_idx" ON "TaskNotification"("deletedAt");
