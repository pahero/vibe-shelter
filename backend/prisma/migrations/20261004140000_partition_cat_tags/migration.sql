ALTER TABLE "CatTag"
ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- Preserve tags already attached to test cats while moving them into the new
-- test partition. Production tags remain in the non-test partition.
INSERT INTO "CatTag" ("id", "name", "color", "isTest", "deletedAt", "version", "createdAt")
SELECT tag."id" || '_test_partition', tag."name", tag."color", true,
       tag."deletedAt", tag."version", tag."createdAt"
FROM "CatTag" tag
WHERE tag."deletedAt" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "CatTagOnCat" assignment
    JOIN "Cat" cat ON cat."id" = assignment."catId"
    WHERE assignment."tagId" = tag."id" AND cat."isTest" = true
  )
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "CatTagOnCat" ("catId", "tagId")
SELECT assignment."catId", assignment."tagId" || '_test_partition'
FROM "CatTagOnCat" assignment
JOIN "Cat" cat ON cat."id" = assignment."catId"
JOIN "CatTag" tag ON tag."id" = assignment."tagId"
WHERE cat."isTest" = true AND tag."deletedAt" IS NULL
ON CONFLICT ("catId", "tagId") DO NOTHING;

UPDATE "AuditEvent" event
SET "tagId" = event."tagId" || '_test_partition'
FROM "Cat" cat
WHERE event."catId" = cat."id"
  AND cat."isTest" = true
  AND event."tagId" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "CatTag" tag
    WHERE tag."id" = event."tagId" || '_test_partition'
  );

DELETE FROM "CatTagOnCat" assignment
USING "Cat" cat, "CatTag" tag
WHERE assignment."catId" = cat."id"
  AND assignment."tagId" = tag."id"
  AND cat."isTest" = true
  AND tag."isTest" = false;

-- Existing concurrent/legacy duplicates are merged before enforcing the
-- active-name invariant. Deleted tags remain available in audit history.
WITH ranked AS (
  SELECT "id", FIRST_VALUE("id") OVER (
    PARTITION BY "name", "isTest" ORDER BY "createdAt", "id"
  ) AS keeper_id,
  ROW_NUMBER() OVER (
    PARTITION BY "name", "isTest" ORDER BY "createdAt", "id"
  ) AS row_number
  FROM "CatTag"
  WHERE "deletedAt" IS NULL
), duplicates AS (
  SELECT "id", keeper_id FROM ranked WHERE row_number > 1
)
INSERT INTO "CatTagOnCat" ("catId", "tagId")
SELECT assignment."catId", duplicates.keeper_id
FROM "CatTagOnCat" assignment
JOIN duplicates ON duplicates."id" = assignment."tagId"
ON CONFLICT ("catId", "tagId") DO NOTHING;

WITH ranked AS (
  SELECT "id", FIRST_VALUE("id") OVER (
    PARTITION BY "name", "isTest" ORDER BY "createdAt", "id"
  ) AS keeper_id,
  ROW_NUMBER() OVER (
    PARTITION BY "name", "isTest" ORDER BY "createdAt", "id"
  ) AS row_number
  FROM "CatTag"
  WHERE "deletedAt" IS NULL
), duplicates AS (
  SELECT "id", keeper_id FROM ranked WHERE row_number > 1
)
DELETE FROM "CatTagOnCat" assignment
USING duplicates
WHERE assignment."tagId" = duplicates."id";

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "name", "isTest" ORDER BY "createdAt", "id"
  ) AS row_number
  FROM "CatTag"
  WHERE "deletedAt" IS NULL
)
UPDATE "CatTag" tag
SET "deletedAt" = CURRENT_TIMESTAMP,
    "version" = tag."version" + 1
FROM ranked
WHERE tag."id" = ranked."id" AND ranked.row_number > 1;

CREATE INDEX "CatTag_isTest_idx" ON "CatTag"("isTest");
CREATE UNIQUE INDEX "CatTag_active_name_isTest_key"
ON "CatTag"("name", "isTest")
WHERE "deletedAt" IS NULL;
