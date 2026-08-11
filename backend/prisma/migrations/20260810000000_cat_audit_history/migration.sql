CREATE TYPE "CatAuditEventType" AS ENUM (
  'name_changed',
  'sex_changed',
  'color_changed',
  'estimated_birth_date_changed',
  'intake_date_changed',
  'rescue_source_changed',
  'microchip_number_changed',
  'passport_number_changed',
  'sterilization_status_changed',
  'status_changed',
  'current_location_changed',
  'photo_created',
  'photo_deleted'
);

ALTER TABLE "Cat" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "CatPhoto" ADD COLUMN "createdByUserId" TEXT;
ALTER TABLE "CatPhoto" ADD COLUMN "deletedByUserId" TEXT;
ALTER TABLE "CatPhoto" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "CatAuditEvent" (
  "id" TEXT NOT NULL,
  "catId" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "eventType" "CatAuditEventType" NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "oldValue" TEXT,
  "newValue" TEXT,
  "photoId" TEXT,
  CONSTRAINT "CatAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Cat_createdByUserId_idx" ON "Cat"("createdByUserId");
CREATE INDEX "CatPhoto_createdByUserId_idx" ON "CatPhoto"("createdByUserId");
CREATE INDEX "CatPhoto_deletedByUserId_idx" ON "CatPhoto"("deletedByUserId");
CREATE INDEX "CatPhoto_deletedAt_idx" ON "CatPhoto"("deletedAt");
CREATE INDEX "CatAuditEvent_catId_occurredAt_idx" ON "CatAuditEvent"("catId", "occurredAt");
CREATE INDEX "CatAuditEvent_actorUserId_idx" ON "CatAuditEvent"("actorUserId");
CREATE INDEX "CatAuditEvent_photoId_idx" ON "CatAuditEvent"("photoId");
CREATE INDEX "CatAuditEvent_eventType_idx" ON "CatAuditEvent"("eventType");

ALTER TABLE "Cat" ADD CONSTRAINT "Cat_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatPhoto" ADD CONSTRAINT "CatPhoto_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatPhoto" ADD CONSTRAINT "CatPhoto_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatAuditEvent" ADD CONSTRAINT "CatAuditEvent_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatAuditEvent" ADD CONSTRAINT "CatAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatAuditEvent" ADD CONSTRAINT "CatAuditEvent_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "CatPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
