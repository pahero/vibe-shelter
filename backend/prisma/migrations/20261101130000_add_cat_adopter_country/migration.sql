CREATE TYPE "CatAdopterCountry" AS ENUM ('UK', 'EU', 'CY');

ALTER TABLE "Cat" ADD COLUMN "adopterCountry" "CatAdopterCountry";
