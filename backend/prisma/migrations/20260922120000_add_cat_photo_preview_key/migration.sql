ALTER TABLE "CatPhoto" ADD COLUMN "previewKey" TEXT;

UPDATE "CatPhoto" SET "previewKey" = "key";
