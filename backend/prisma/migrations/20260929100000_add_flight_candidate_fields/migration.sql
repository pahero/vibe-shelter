CREATE TYPE "PreventiveTreatmentType" AS ENUM ('FIRST_VACCINE', 'SECOND_VACCINE', 'RABIES', 'OTHER');

ALTER TYPE "CatAuditEventType" ADD VALUE 'adopter_name_changed';
ALTER TYPE "CatAuditEventType" ADD VALUE 'adopter_address_changed';
ALTER TYPE "CatAuditEventType" ADD VALUE 'preventive_treatment_type_changed';

ALTER TABLE "Cat"
ADD COLUMN "adopterName" TEXT,
ADD COLUMN "adopterAddress" TEXT;

ALTER TABLE "CatPreventiveTreatment"
ADD COLUMN "type" "PreventiveTreatmentType" NOT NULL DEFAULT 'OTHER';
