ALTER TYPE "CatAuditEventType" ADD VALUE IF NOT EXISTS 'cat_archived';

ALTER TABLE "Cat" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Cat" ADD COLUMN "archivationReasonId" TEXT;
CREATE INDEX "Cat_archivedAt_idx" ON "Cat"("archivedAt");
CREATE INDEX "Cat_archivationReasonId_idx" ON "Cat"("archivationReasonId");

CREATE TABLE "CatArchivationReason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CatArchivationReason_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CatArchivationReason_active_name_key" ON "CatArchivationReason"("name") WHERE "deletedAt" IS NULL;
CREATE INDEX "CatArchivationReason_deletedAt_idx" ON "CatArchivationReason"("deletedAt");

CREATE TABLE "CatArchivationReasonAuditEvent" (
    "id" TEXT NOT NULL,
    "reasonId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatArchivationReasonAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CatArchivationReasonAuditEvent_reasonId_idx" ON "CatArchivationReasonAuditEvent"("reasonId");
CREATE INDEX "CatArchivationReasonAuditEvent_actorUserId_idx" ON "CatArchivationReasonAuditEvent"("actorUserId");
CREATE INDEX "CatArchivationReasonAuditEvent_createdAt_idx" ON "CatArchivationReasonAuditEvent"("createdAt");

ALTER TABLE "Cat" ADD CONSTRAINT "Cat_archivationReasonId_fkey" FOREIGN KEY ("archivationReasonId") REFERENCES "CatArchivationReason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CatArchivationReasonAuditEvent" ADD CONSTRAINT "CatArchivationReasonAuditEvent_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "CatArchivationReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatArchivationReasonAuditEvent" ADD CONSTRAINT "CatArchivationReasonAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
