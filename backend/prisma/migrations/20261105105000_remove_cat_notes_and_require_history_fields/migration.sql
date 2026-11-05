-- Remove audit records that cannot be represented after CatNote support is removed
-- or that have no event type for the history query to map.
DELETE FROM "AuditEvent"
WHERE "noteId" IS NOT NULL
   OR "eventType" IS NULL
   OR "eventType" IN (
     'note_created',
     'note_deleted',
     'note_restored',
     'note_date_changed',
     'note_comment_changed'
   );

-- Preserve valid entities while satisfying newly required scalar fields.
UPDATE "User"
SET "fullName" = "email"
WHERE "fullName" IS NULL;

UPDATE "Vaccination"
SET "vaccineName" = 'Unknown vaccine'
WHERE "vaccineName" IS NULL;

ALTER TABLE "AuditEvent" DROP CONSTRAINT "AuditEvent_noteId_fkey";
DROP INDEX "AuditEvent_noteId_idx";
ALTER TABLE "AuditEvent" DROP COLUMN "noteId";
DROP TABLE "CatNote";

ALTER TABLE "User" ALTER COLUMN "fullName" SET NOT NULL;
ALTER TABLE "AuditEvent" ALTER COLUMN "eventType" SET NOT NULL;
ALTER TABLE "Vaccination" ALTER COLUMN "vaccineName" SET NOT NULL;
