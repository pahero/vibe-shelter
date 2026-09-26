-- Store PDF documents attached to a cat and retain their audit trail through CatAuditEvent.
CREATE TYPE "CatAuditEventType_new" AS ENUM (
  'cat_created', 'cat_archived', 'cat_dearchived', 'archivation_reason_create',
  'archivation_reason_update', 'archivation_reason_delete', 'name_changed',
  'sex_changed', 'color_changed', 'estimated_birth_date_changed', 'intake_date_changed',
  'rescue_source_changed', 'microchip_number_changed', 'passport_number_changed',
  'sterilization_status_changed', 'status_changed', 'current_location_changed',
  'photo_created', 'photo_deleted', 'document_created', 'document_deleted',
  'weight_created', 'weight_deleted', 'tag_added_to_cat', 'tag_removed_from_cat',
  'task_created', 'task_updated', 'task_comment_changed', 'task_due_date_changed',
  'task_receivers_changed', 'task_deleted', 'task_completed'
);
ALTER TABLE "CatAuditEvent" ALTER COLUMN "eventType" TYPE "CatAuditEventType_new" USING ("eventType"::text::"CatAuditEventType_new");
ALTER TYPE "CatAuditEventType" RENAME TO "CatAuditEventType_old";
ALTER TYPE "CatAuditEventType_new" RENAME TO "CatAuditEventType";
DROP TYPE "CatAuditEventType_old";

CREATE TABLE "CatDocument" (
  "id" TEXT NOT NULL,
  "catId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "deletedByUserId" TEXT,
  "deletedAt" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatDocument_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CatDocument_key_key" ON "CatDocument"("key");
CREATE INDEX "CatDocument_catId_idx" ON "CatDocument"("catId");
CREATE INDEX "CatDocument_createdByUserId_idx" ON "CatDocument"("createdByUserId");
CREATE INDEX "CatDocument_deletedByUserId_idx" ON "CatDocument"("deletedByUserId");
CREATE INDEX "CatDocument_deletedAt_idx" ON "CatDocument"("deletedAt");
CREATE INDEX "CatDocument_createdAt_idx" ON "CatDocument"("createdAt");
ALTER TABLE "CatDocument" ADD CONSTRAINT "CatDocument_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatDocument" ADD CONSTRAINT "CatDocument_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatDocument" ADD CONSTRAINT "CatDocument_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
