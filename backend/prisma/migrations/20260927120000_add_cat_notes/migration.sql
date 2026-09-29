ALTER TYPE "CatAuditEventType" ADD VALUE 'note_created';
ALTER TYPE "CatAuditEventType" ADD VALUE 'note_deleted';
ALTER TYPE "CatAuditEventType" ADD VALUE 'note_date_changed';
ALTER TYPE "CatAuditEventType" ADD VALUE 'note_comment_changed';

CREATE TABLE "CatNote" (
  "id" TEXT NOT NULL, "catId" TEXT NOT NULL, "date" DATE NOT NULL, "comment" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3), "concurrencyToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CatNote_catId_date_idx" ON "CatNote"("catId", "date");
CREATE INDEX "CatNote_deletedAt_idx" ON "CatNote"("deletedAt");
ALTER TABLE "CatNote" ADD CONSTRAINT "CatNote_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
