-- Ensure tag audit events survive tag deletion: tagId must stay nullable and
-- the FK must be SET NULL. Reapplied idempotently for reused test databases.
ALTER TABLE "TagAuditEvent" ALTER COLUMN "tagId" DROP NOT NULL;
ALTER TABLE "TagAuditEvent" DROP CONSTRAINT IF EXISTS "TagAuditEvent_tagId_fkey";
ALTER TABLE "TagAuditEvent" ADD CONSTRAINT "TagAuditEvent_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CatTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;