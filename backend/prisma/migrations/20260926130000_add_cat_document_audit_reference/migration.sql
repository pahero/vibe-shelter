ALTER TABLE "CatAuditEvent" ADD COLUMN "documentId" TEXT;
CREATE INDEX "CatAuditEvent_documentId_idx" ON "CatAuditEvent"("documentId");
ALTER TABLE "CatAuditEvent" ADD CONSTRAINT "CatAuditEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CatDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
