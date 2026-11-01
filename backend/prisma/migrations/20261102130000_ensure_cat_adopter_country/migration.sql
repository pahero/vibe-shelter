DO $$ BEGIN
  CREATE TYPE "CatAdopterCountry" AS ENUM ('UK', 'EU', 'CY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Cat" ADD COLUMN IF NOT EXISTS "adopterCountry" "CatAdopterCountry";
