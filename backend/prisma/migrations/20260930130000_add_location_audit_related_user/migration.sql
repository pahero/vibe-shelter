ALTER TABLE "LocationAuditEvent" ADD COLUMN "relatedUserId" TEXT;
CREATE INDEX "LocationAuditEvent_relatedUserId_idx" ON "LocationAuditEvent"("relatedUserId");
ALTER TABLE "LocationAuditEvent" ADD CONSTRAINT "LocationAuditEvent_relatedUserId_fkey" FOREIGN KEY ("relatedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
