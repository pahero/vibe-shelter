CREATE TABLE "LocationOwner" (
    "locationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "LocationOwner_pkey" PRIMARY KEY ("locationId", "userId")
);

CREATE INDEX "LocationOwner_userId_idx" ON "LocationOwner"("userId");

ALTER TABLE "LocationOwner" ADD CONSTRAINT "LocationOwner_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LocationOwner" ADD CONSTRAINT "LocationOwner_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "LocationOwner" ("locationId", "userId")
SELECT "id", "ownerId" FROM "Location" WHERE "ownerId" IS NOT NULL;

-- Preserve assignments written by older versions after the join table migration.
INSERT INTO "LocationOwner" ("locationId", "userId")
SELECT "id", "ownerId" FROM "Location" WHERE "ownerId" IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE "Location" DROP CONSTRAINT "Location_ownerId_fkey";
DROP INDEX "Location_ownerId_idx";
ALTER TABLE "Location" DROP COLUMN "ownerId";
