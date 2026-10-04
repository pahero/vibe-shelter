ALTER TABLE "AuditEvent"
ADD COLUMN IF NOT EXISTS "isTest" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "AuditEvent_isTest_idx" ON "AuditEvent"("isTest");

CREATE OR REPLACE FUNCTION "setAuditEventIsTestPartition"() RETURNS TRIGGER AS $$
DECLARE
    entity_is_test BOOLEAN;
BEGIN
    entity_is_test := NULL;

    IF NEW."catId" IS NOT NULL THEN
        SELECT "isTest" INTO entity_is_test FROM "Cat" WHERE "id" = NEW."catId";
    END IF;
    IF entity_is_test IS NULL AND NEW."flightId" IS NOT NULL THEN
        SELECT "isTest" INTO entity_is_test FROM "Flight" WHERE "id" = NEW."flightId";
    END IF;
    IF entity_is_test IS NULL AND NEW."assignmentId" IS NOT NULL THEN
        SELECT flight."isTest" INTO entity_is_test
        FROM "FlightCatAssignment" assignment
        JOIN "Flight" flight ON flight."id" = assignment."flightId"
        WHERE assignment."id" = NEW."assignmentId";
    END IF;
    IF entity_is_test IS NULL AND NEW."locationId" IS NOT NULL THEN
        SELECT "isTest" INTO entity_is_test FROM "Location" WHERE "id" = NEW."locationId";
    END IF;
    IF entity_is_test IS NULL AND NEW."tagId" IS NOT NULL THEN
        SELECT "isTest" INTO entity_is_test FROM "CatTag" WHERE "id" = NEW."tagId";
    END IF;
    IF entity_is_test IS NULL AND NEW."archivingReasonId" IS NOT NULL THEN
        SELECT "isTest" INTO entity_is_test FROM "CatArchivingReason" WHERE "id" = NEW."archivingReasonId";
    END IF;
    IF entity_is_test IS NULL AND NEW."treatmentId" IS NOT NULL THEN
        SELECT cat."isTest" INTO entity_is_test
        FROM "CatTreatment" treatment
        JOIN "Cat" cat ON cat."id" = treatment."catId"
        WHERE treatment."id" = NEW."treatmentId";
    END IF;
    IF entity_is_test IS NULL AND NEW."weightId" IS NOT NULL THEN
        SELECT cat."isTest" INTO entity_is_test
        FROM "CatWeight" weight
        JOIN "Cat" cat ON cat."id" = weight."catId"
        WHERE weight."id" = NEW."weightId";
    END IF;
    IF entity_is_test IS NULL AND NEW."taskId" IS NOT NULL THEN
        SELECT cat."isTest" INTO entity_is_test
        FROM "CatTask" task
        JOIN "Cat" cat ON cat."id" = task."catId"
        WHERE task."id" = NEW."taskId";
    END IF;
    IF entity_is_test IS NULL AND NEW."medicalNoteId" IS NOT NULL THEN
        SELECT cat."isTest" INTO entity_is_test
        FROM "CatMedicalNote" note
        JOIN "Cat" cat ON cat."id" = note."catId"
        WHERE note."id" = NEW."medicalNoteId";
    END IF;
    IF entity_is_test IS NULL AND NEW."preventiveTreatmentId" IS NOT NULL THEN
        SELECT cat."isTest" INTO entity_is_test
        FROM "CatPreventiveTreatment" treatment
        JOIN "Cat" cat ON cat."id" = treatment."catId"
        WHERE treatment."id" = NEW."preventiveTreatmentId";
    END IF;
    IF entity_is_test IS NULL AND NEW."noteId" IS NOT NULL THEN
        SELECT cat."isTest" INTO entity_is_test
        FROM "CatNote" note
        JOIN "Cat" cat ON cat."id" = note."catId"
        WHERE note."id" = NEW."noteId";
    END IF;
    IF entity_is_test IS NULL THEN
        SELECT "isTest" INTO entity_is_test FROM "User" WHERE "id" = NEW."actorUserId";
    END IF;

    NEW."isTest" := COALESCE(entity_is_test, false);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "AuditEvent_setIsTestPartition" ON "AuditEvent";
CREATE TRIGGER "AuditEvent_setIsTestPartition"
BEFORE INSERT ON "AuditEvent"
FOR EACH ROW EXECUTE FUNCTION "setAuditEventIsTestPartition"();
