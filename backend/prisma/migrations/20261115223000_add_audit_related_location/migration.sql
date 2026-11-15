ALTER TABLE "AuditEvent" ADD COLUMN "relatedLocationId" TEXT;

ALTER TABLE "AuditEvent"
ADD CONSTRAINT "AuditEvent_relatedLocationId_fkey"
FOREIGN KEY ("relatedLocationId") REFERENCES "Location"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AuditEvent_relatedLocationId_idx" ON "AuditEvent"("relatedLocationId");
