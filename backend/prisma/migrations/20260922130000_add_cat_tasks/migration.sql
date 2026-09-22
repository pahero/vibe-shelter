CREATE TABLE "CatTask" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CatTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatTaskReceiver" (
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "CatTaskReceiver_pkey" PRIMARY KEY ("taskId", "userId")
);

CREATE TABLE "TaskNotification" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CatTask_catId_dueDate_idx" ON "CatTask"("catId", "dueDate");
CREATE INDEX "CatTask_isTest_completedAt_dueDate_idx" ON "CatTask"("isTest", "completedAt", "dueDate");
CREATE INDEX "CatTask_completedByUserId_idx" ON "CatTask"("completedByUserId");
CREATE INDEX "CatTaskReceiver_userId_idx" ON "CatTaskReceiver"("userId");
CREATE UNIQUE INDEX "TaskNotification_taskId_userId_key" ON "TaskNotification"("taskId", "userId");
CREATE INDEX "TaskNotification_userId_createdAt_idx" ON "TaskNotification"("userId", "createdAt");

ALTER TABLE "CatTask" ADD CONSTRAINT "CatTask_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatTask" ADD CONSTRAINT "CatTask_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatTaskReceiver" ADD CONSTRAINT "CatTaskReceiver_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CatTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatTaskReceiver" ADD CONSTRAINT "CatTaskReceiver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaskNotification" ADD CONSTRAINT "TaskNotification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CatTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskNotification" ADD CONSTRAINT "TaskNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
