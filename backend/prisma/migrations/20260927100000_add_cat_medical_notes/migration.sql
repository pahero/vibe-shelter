ALTER TYPE "CatAuditEventType" ADD VALUE 'medical_note_created';
ALTER TYPE "CatAuditEventType" ADD VALUE 'medical_note_deleted';
ALTER TYPE "CatAuditEventType" ADD VALUE 'medical_note_date_changed';
ALTER TYPE "CatAuditEventType" ADD VALUE 'medical_note_comment_changed';

CREATE TABLE "CatMedicalNote" (
  "id" TEXT NOT NULL,
  "catId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "comment" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "concurrencyToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatMedicalNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CatMedicalNote_catId_date_idx" ON "CatMedicalNote"("catId", "date");
CREATE INDEX "CatMedicalNote_deletedAt_idx" ON "CatMedicalNote"("deletedAt");
ALTER TABLE "CatMedicalNote" ADD CONSTRAINT "CatMedicalNote_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
