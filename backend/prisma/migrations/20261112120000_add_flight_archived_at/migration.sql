ALTER TABLE "Flight" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Flight_archivedAt_idx" ON "Flight"("archivedAt");
