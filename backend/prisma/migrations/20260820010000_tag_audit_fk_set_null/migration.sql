-- Tag audit events must survive tag deletion so the audit trail stays intact.
-- Recreate the tag FK as SET NULL and make tagId nullable regardless of how the
-- table was originally created in already-reused test/replica databases.
ALTER TABLE "TagAuditEvent" ALTER COLUMN "tagId" DROP NOT NULL;
ALTER TABLE "TagAuditEvent" DROP CONSTRAINT IF EXISTS "TagAuditEvent_tagId_fkey";
ALTER TABLE "TagAuditEvent" ADD CONSTRAINT "TagAuditEvent_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CatTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;