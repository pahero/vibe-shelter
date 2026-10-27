CREATE TABLE "CatFavorite" (
    "userId" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CatFavorite_pkey" PRIMARY KEY ("userId", "catId")
);

CREATE INDEX "CatFavorite_catId_idx" ON "CatFavorite"("catId");

ALTER TABLE "CatFavorite" ADD CONSTRAINT "CatFavorite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatFavorite" ADD CONSTRAINT "CatFavorite_catId_fkey"
    FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
