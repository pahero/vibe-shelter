ALTER TABLE "CatAuditEvent" ADD COLUMN "treatmentId" TEXT;
CREATE INDEX "CatAuditEvent_treatmentId_idx" ON "CatAuditEvent"("treatmentId");
ALTER TABLE "CatAuditEvent" ADD CONSTRAINT "CatAuditEvent_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "CatTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
