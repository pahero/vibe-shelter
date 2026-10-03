ALTER TABLE "Cat" ADD COLUMN "nameNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TYPE "CatAuditEventType" ADD VALUE 'name_number_changed';

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "name", "isTest"
    ORDER BY "createdAt", "id"
  ) AS number
  FROM "Cat"
)
UPDATE "Cat" AS cat
SET "nameNumber" = numbered.number
FROM numbered
WHERE cat."id" = numbered."id";

CREATE UNIQUE INDEX "Cat_name_nameNumber_isTest_key"
ON "Cat"("name", "nameNumber", "isTest");
