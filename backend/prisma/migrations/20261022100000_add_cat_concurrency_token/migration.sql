ALTER TABLE "Cat" ADD COLUMN "concurrencyToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
