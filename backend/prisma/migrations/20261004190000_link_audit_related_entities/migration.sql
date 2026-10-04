ALTER TABLE "AuditEvent"
ADD COLUMN IF NOT EXISTS "weightId" TEXT,
ADD COLUMN IF NOT EXISTS "taskId" TEXT,
ADD COLUMN IF NOT EXISTS "medicalNoteId" TEXT,
ADD COLUMN IF NOT EXISTS "preventiveTreatmentId" TEXT,
ADD COLUMN IF NOT EXISTS "noteId" TEXT;

CREATE INDEX IF NOT EXISTS "AuditEvent_weightId_idx" ON "AuditEvent"("weightId");
CREATE INDEX IF NOT EXISTS "AuditEvent_taskId_idx" ON "AuditEvent"("taskId");
CREATE INDEX IF NOT EXISTS "AuditEvent_medicalNoteId_idx" ON "AuditEvent"("medicalNoteId");
CREATE INDEX IF NOT EXISTS "AuditEvent_preventiveTreatmentId_idx" ON "AuditEvent"("preventiveTreatmentId");
CREATE INDEX IF NOT EXISTS "AuditEvent_noteId_idx" ON "AuditEvent"("noteId");

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditEvent_weightId_fkey') THEN
        ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_weightId_fkey" FOREIGN KEY ("weightId") REFERENCES "CatWeight"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditEvent_taskId_fkey') THEN
        ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CatTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditEvent_medicalNoteId_fkey') THEN
        ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_medicalNoteId_fkey" FOREIGN KEY ("medicalNoteId") REFERENCES "CatMedicalNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditEvent_preventiveTreatmentId_fkey') THEN
        ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_preventiveTreatmentId_fkey" FOREIGN KEY ("preventiveTreatmentId") REFERENCES "CatPreventiveTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditEvent_noteId_fkey') THEN
        ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "CatNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
