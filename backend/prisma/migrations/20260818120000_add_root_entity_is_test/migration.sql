ALTER TABLE "Location" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Cat" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Location_isTest_idx" ON "Location"("isTest");
CREATE INDEX "Cat_isTest_idx" ON "Cat"("isTest");
