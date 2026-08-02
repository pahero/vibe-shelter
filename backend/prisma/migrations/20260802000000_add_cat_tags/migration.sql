CREATE TABLE "CatTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatTagOnCat" (
    "catId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "CatTagOnCat_pkey" PRIMARY KEY ("catId", "tagId")
);

CREATE UNIQUE INDEX "CatTag_name_key" ON "CatTag"("name");
CREATE INDEX "CatTag_name_idx" ON "CatTag"("name");
CREATE INDEX "CatTagOnCat_tagId_idx" ON "CatTagOnCat"("tagId");

ALTER TABLE "CatTagOnCat" ADD CONSTRAINT "CatTagOnCat_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatTagOnCat" ADD CONSTRAINT "CatTagOnCat_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CatTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
