ALTER TYPE "CatAuditEventType" ADD VALUE 'felv_fiv_test_done_changed';

ALTER TABLE "Cat"
ADD COLUMN "felvFivTestDone" BOOLEAN NOT NULL DEFAULT false;
