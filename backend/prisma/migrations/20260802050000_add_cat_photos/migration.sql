CREATE TABLE "CatPhoto" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatPhoto_key_key" ON "CatPhoto"("key");
CREATE INDEX "CatPhoto_catId_idx" ON "CatPhoto"("catId");
CREATE INDEX "CatPhoto_createdAt_idx" ON "CatPhoto"("createdAt");

INSERT INTO "CatPhoto" ("id", "catId", "key", "createdAt")
SELECT CONCAT('migrated_', "id"), "id", "primaryPhotoKey", NOW()
FROM "Cat"
WHERE "primaryPhotoKey" IS NOT NULL;

ALTER TABLE "CatPhoto" ADD CONSTRAINT "CatPhoto_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
