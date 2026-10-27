ALTER TABLE "Cat" RENAME COLUMN "rescueSource" TO "intakeDetails";

CREATE TYPE "CatIntakeSource" AS ENUM (
  'SHELTER_VOLUNTEER',
  'OWNER_SURRENDER',
  'RESCUE_REQUEST',
  'VET_CLINIC',
  'RESCUE_ORGANISATION',
  'OTHER'
);

ALTER TABLE "Cat" ADD COLUMN "intakeSource" "CatIntakeSource";
