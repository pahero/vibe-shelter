ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
