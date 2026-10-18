ALTER TABLE "Cat" ADD COLUMN "passport" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Cat" SET "passport" = "passportNumber" IS NOT NULL;
ALTER TABLE "Cat" DROP COLUMN "passportNumber";
ALTER TABLE "Cat" ADD COLUMN "sponsorName" TEXT;
