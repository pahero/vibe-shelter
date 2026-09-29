CREATE TYPE "FlightAuditEventType" AS ENUM (
  'flight_created',
  'flight_deleted',
  'flight_restored',
  'flight_date_changed',
  'flight_airport_changed',
  'flight_number_changed',
  'flight_parent_changed',
  'flight_cat_assigned',
  'flight_cat_unassigned',
  'flight_cat_restored',
  'flight_cat_f2f_changed',
  'flight_cat_traces_changed'
);


CREATE TABLE "Flight" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "airport" TEXT NOT NULL,
  "flightNumber" TEXT NOT NULL,
  "flightParent" TEXT NOT NULL,
  "isTest" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "concurrencyToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FlightCatAssignment" (
  "id" TEXT NOT NULL,
  "flightId" TEXT NOT NULL,
  "catId" TEXT NOT NULL,
  "f2fDone" BOOLEAN NOT NULL DEFAULT false,
  "tracesDone" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "concurrencyToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FlightCatAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FlightAuditEvent" (
  "id" TEXT NOT NULL,
  "flightId" TEXT NOT NULL,
  "catId" TEXT,
  "assignmentId" TEXT,
  "actorUserId" TEXT NOT NULL,
  "eventType" "FlightAuditEventType" NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FlightAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Flight_date_idx" ON "Flight"("date");
CREATE INDEX "Flight_deletedAt_idx" ON "Flight"("deletedAt");
CREATE INDEX "Flight_isTest_idx" ON "Flight"("isTest");
CREATE INDEX "FlightCatAssignment_flightId_deletedAt_idx" ON "FlightCatAssignment"("flightId", "deletedAt");
CREATE INDEX "FlightCatAssignment_catId_deletedAt_idx" ON "FlightCatAssignment"("catId", "deletedAt");
CREATE INDEX "FlightCatAssignment_concurrencyToken_idx" ON "FlightCatAssignment"("concurrencyToken");
CREATE UNIQUE INDEX "FlightCatAssignment_active_flight_cat_key"
  ON "FlightCatAssignment"("flightId", "catId") WHERE "deletedAt" IS NULL;
CREATE INDEX "FlightAuditEvent_flightId_createdAt_idx" ON "FlightAuditEvent"("flightId", "createdAt");
CREATE INDEX "FlightAuditEvent_catId_createdAt_idx" ON "FlightAuditEvent"("catId", "createdAt");
CREATE INDEX "FlightAuditEvent_assignmentId_idx" ON "FlightAuditEvent"("assignmentId");
CREATE INDEX "FlightAuditEvent_actorUserId_idx" ON "FlightAuditEvent"("actorUserId");
CREATE INDEX "FlightAuditEvent_eventType_idx" ON "FlightAuditEvent"("eventType");

ALTER TABLE "FlightCatAssignment"
  ADD CONSTRAINT "FlightCatAssignment_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FlightCatAssignment_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FlightAuditEvent"
  ADD CONSTRAINT "FlightAuditEvent_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FlightAuditEvent_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "FlightAuditEvent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "FlightCatAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "FlightAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
