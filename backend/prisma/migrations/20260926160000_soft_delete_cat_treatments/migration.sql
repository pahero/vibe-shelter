ALTER TABLE "CatTreatment" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "concurrencyToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
CREATE INDEX "CatTreatment_deletedAt_idx" ON "CatTreatment"("deletedAt");
