CREATE TABLE "FlightPhoto" (
    "id" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "previewKey" TEXT,
    "deletedAt" TIMESTAMP(3),
    "concurrencyToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FlightPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FlightPhoto_key_key" ON "FlightPhoto"("key");
CREATE INDEX "FlightPhoto_flightId_deletedAt_idx" ON "FlightPhoto"("flightId", "deletedAt");
CREATE INDEX "FlightPhoto_deletedAt_idx" ON "FlightPhoto"("deletedAt");
CREATE INDEX "FlightPhoto_concurrencyToken_idx" ON "FlightPhoto"("concurrencyToken");
ALTER TABLE "FlightPhoto" ADD CONSTRAINT "FlightPhoto_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditEvent" ADD COLUMN "flightPhotoId" TEXT;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_flightPhotoId_fkey" FOREIGN KEY ("flightPhotoId") REFERENCES "FlightPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "AuditEvent_flightPhotoId_idx" ON "AuditEvent"("flightPhotoId");
