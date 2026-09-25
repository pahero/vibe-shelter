ALTER TABLE "CatTask" ADD COLUMN "notificationSentAt" TIMESTAMP(3);
CREATE INDEX "CatTask_notificationSentAt_idx" ON "CatTask"("notificationSentAt");
