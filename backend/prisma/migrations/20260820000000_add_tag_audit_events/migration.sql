-- CreateTable
CREATE TABLE "TagAuditEvent" (
    "id" TEXT NOT NULL,
    "tagId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TagAuditEvent_tagId_idx" ON "TagAuditEvent"("tagId");

-- CreateIndex
CREATE INDEX "TagAuditEvent_actorUserId_idx" ON "TagAuditEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "TagAuditEvent_createdAt_idx" ON "TagAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "TagAuditEvent" ADD CONSTRAINT "TagAuditEvent_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CatTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagAuditEvent" ADD CONSTRAINT "TagAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;