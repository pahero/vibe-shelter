ALTER TYPE "CatAuditEventType" ADD VALUE IF NOT EXISTS 'archivation_reason_create';
ALTER TYPE "CatAuditEventType" ADD VALUE IF NOT EXISTS 'archivation_reason_update';
ALTER TYPE "CatAuditEventType" ADD VALUE IF NOT EXISTS 'archivation_reason_delete';

ALTER TABLE "CatAuditEvent" ALTER COLUMN "catId" DROP NOT NULL;
ALTER TABLE "CatAuditEvent" ADD COLUMN "archivationReasonId" TEXT;
ALTER TABLE "CatAuditEvent" ADD CONSTRAINT "CatAuditEvent_archivationReasonId_fkey" FOREIGN KEY ("archivationReasonId") REFERENCES "CatArchivationReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "CatAuditEvent_archivationReasonId_occurredAt_idx" ON "CatAuditEvent"("archivationReasonId", "occurredAt");
