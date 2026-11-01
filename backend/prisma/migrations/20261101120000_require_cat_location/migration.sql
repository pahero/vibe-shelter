DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Cat" WHERE "currentLocationId" IS NULL) THEN
    IF NOT EXISTS (SELECT 1 FROM "Location" WHERE "deletedAt" IS NULL) THEN
      RAISE EXCEPTION 'Cannot require cat locations: create an active location and assign all cats before applying this migration';
    END IF;
    UPDATE "Cat"
    SET "currentLocationId" = (SELECT "id" FROM "Location" WHERE "deletedAt" IS NULL ORDER BY "createdAt", "id" LIMIT 1)
    WHERE "currentLocationId" IS NULL;
  END IF;
END $$;

ALTER TABLE "Cat" DROP CONSTRAINT "Cat_currentLocationId_fkey";
ALTER TABLE "Cat" ALTER COLUMN "currentLocationId" SET NOT NULL;
ALTER TABLE "Cat" ADD CONSTRAINT "Cat_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
