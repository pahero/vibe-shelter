ALTER TABLE "Location" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "Location_deletedAt_idx" ON "Location"("deletedAt");

CREATE TABLE "LocationAuditEvent" (
    "id" TEXT NOT NULL,
    "locationId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LocationAuditEvent_locationId_idx" ON "LocationAuditEvent"("locationId");
CREATE INDEX "LocationAuditEvent_actorUserId_idx" ON "LocationAuditEvent"("actorUserId");
CREATE INDEX "LocationAuditEvent_createdAt_idx" ON "LocationAuditEvent"("createdAt");

ALTER TABLE "LocationAuditEvent" ADD CONSTRAINT "LocationAuditEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LocationAuditEvent" ADD CONSTRAINT "LocationAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
