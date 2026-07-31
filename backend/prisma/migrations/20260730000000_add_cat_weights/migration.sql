CREATE TABLE "CatWeight" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatWeight_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CatWeight_catId_idx" ON "CatWeight"("catId");
CREATE INDEX "CatWeight_measuredAt_idx" ON "CatWeight"("measuredAt");

ALTER TABLE "CatWeight" ADD CONSTRAINT "CatWeight_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
