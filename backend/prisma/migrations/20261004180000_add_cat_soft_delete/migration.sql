ALTER TABLE "Cat"
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "Cat_deletedAt_idx" ON "Cat"("deletedAt");
