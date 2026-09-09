-- Locations archived before soft deletion was introduced must not retain active-name uniqueness.
UPDATE "Location"
SET "deletedAt" = "updatedAt"
WHERE "status" = 'ARCHIVED' AND "deletedAt" IS NULL;
