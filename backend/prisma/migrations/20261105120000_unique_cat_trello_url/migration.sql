UPDATE "Cat"
SET "trelloUrl" = regexp_replace(
  "trelloUrl",
  '^https://trello.com/c/([^/?#]+).*$',
  'https://trello.com/c/\1'
)
WHERE "trelloUrl" LIKE 'https://trello.com/c/%';

WITH duplicates AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "trelloUrl"
    ORDER BY "createdAt", "id"
  ) AS row_number
  FROM "Cat"
  WHERE "trelloUrl" IS NOT NULL
)
UPDATE "Cat"
SET "trelloUrl" = NULL
WHERE "id" IN (SELECT "id" FROM duplicates WHERE row_number > 1);

CREATE UNIQUE INDEX "Cat_trelloUrl_key" ON "Cat"("trelloUrl");
