-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CatSex" AS ENUM ('FEMALE', 'MALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SterilizationStatus" AS ENUM ('STERILIZED', 'NOT_STERILIZED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PreventiveTreatmentType" AS ENUM ('FIRST_VACCINE', 'SECOND_VACCINE', 'RABIES', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "fullName" TEXT,
    "passwordHash" TEXT,
    "passwordChangeRequired" BOOLEAN NOT NULL DEFAULT false,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNumber" INTEGER NOT NULL DEFAULT 1,
    "sex" "CatSex" NOT NULL DEFAULT 'UNKNOWN',
    "color" TEXT,
    "estimatedBirthDate" TIMESTAMP(3),
    "intakeDate" TIMESTAMP(3),
    "rescueSource" TEXT,
    "microchipNumber" TEXT,
    "passportNumber" TEXT,
    "adopterName" TEXT,
    "adopterAddress" TEXT,
    "felvFivTestDone" BOOLEAN NOT NULL DEFAULT false,
    "sterilizationStatus" "SterilizationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "archivingReasonId" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "currentLocationId" TEXT,
    "createdByUserId" TEXT,
    "primaryPhotoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatArchivingReason" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatArchivingReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatPhoto" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "previewKey" TEXT,
    "createdByUserId" TEXT,
    "deletedByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatDocument" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "deletedByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#ffb38a',
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatTagOnCat" (
    "catId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatTagOnCat_pkey" PRIMARY KEY ("catId","tagId")
);

-- CreateTable
CREATE TABLE "CatWeight" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "measuredAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatTreatment" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "instructions" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "dosesPerDay" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "concurrencyToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatTreatmentAdministration" (
    "treatmentId" TEXT NOT NULL,
    "administeredOn" DATE NOT NULL,
    "doseNumber" INTEGER NOT NULL,
    "checkedByUserId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatTreatmentAdministration_pkey" PRIMARY KEY ("treatmentId","administeredOn","doseNumber")
);

-- CreateTable
CREATE TABLE "Flight" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "airport" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "flightParent" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "concurrencyToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightCatAssignment" (
    "id" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "f2fDone" BOOLEAN NOT NULL DEFAULT false,
    "tracesDone" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "concurrencyToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightCatAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "catId" TEXT,
    "flightId" TEXT,
    "assignmentId" TEXT,
    "locationId" TEXT,
    "tagId" TEXT,
    "archivingReasonId" TEXT,
    "treatmentId" TEXT,
    "photoId" TEXT,
    "documentId" TEXT,
    "weightId" TEXT,
    "taskId" TEXT,
    "medicalNoteId" TEXT,
    "preventiveTreatmentId" TEXT,
    "noteId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "relatedUserId" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "eventType" TEXT,
    "action" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "treatmentAdministrationDate" DATE,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatMedicalNote" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "comment" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "concurrencyToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatMedicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatPreventiveTreatment" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PreventiveTreatmentType" NOT NULL DEFAULT 'OTHER',
    "deletedAt" TIMESTAMP(3),
    "concurrencyToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatPreventiveTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatNote" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "comment" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "concurrencyToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatTask" (
    "id" TEXT NOT NULL,
    "catId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "concurrencyToken" TEXT NOT NULL,
    "notificationSentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatTaskReceiver" (
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CatTaskReceiver_pkey" PRIMARY KEY ("taskId","userId")
);

-- CreateTable
CREATE TABLE "TaskNotification" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionTokenHash_key" ON "Session"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "Session_revokedAt_idx" ON "Session"("revokedAt");

-- CreateIndex
CREATE INDEX "Location_ownerId_idx" ON "Location"("ownerId");

-- CreateIndex
CREATE INDEX "Location_isTest_idx" ON "Location"("isTest");

-- CreateIndex
CREATE INDEX "Location_status_idx" ON "Location"("status");

-- CreateIndex
CREATE INDEX "Location_deletedAt_idx" ON "Location"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cat_microchipNumber_key" ON "Cat"("microchipNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Cat_passportNumber_key" ON "Cat"("passportNumber");

-- CreateIndex
CREATE INDEX "Cat_createdByUserId_idx" ON "Cat"("createdByUserId");

-- CreateIndex
CREATE INDEX "Cat_currentLocationId_idx" ON "Cat"("currentLocationId");

-- CreateIndex
CREATE INDEX "Cat_isTest_idx" ON "Cat"("isTest");

-- CreateIndex
CREATE INDEX "Cat_archivedAt_idx" ON "Cat"("archivedAt");

-- CreateIndex
CREATE INDEX "Cat_deletedAt_idx" ON "Cat"("deletedAt");

-- CreateIndex
CREATE INDEX "Cat_archivingReasonId_idx" ON "Cat"("archivingReasonId");

-- CreateIndex
CREATE INDEX "Cat_name_idx" ON "Cat"("name");

-- CreateIndex
CREATE INDEX "Cat_intakeDate_idx" ON "Cat"("intakeDate");

-- CreateIndex
CREATE UNIQUE INDEX "Cat_name_nameNumber_isTest_key" ON "Cat"("name", "nameNumber", "isTest");

-- CreateIndex
CREATE INDEX "CatArchivingReason_deletedAt_idx" ON "CatArchivingReason"("deletedAt");

-- CreateIndex
CREATE INDEX "CatArchivingReason_isTest_idx" ON "CatArchivingReason"("isTest");

-- CreateIndex
CREATE UNIQUE INDEX "CatPhoto_key_key" ON "CatPhoto"("key");

-- CreateIndex
CREATE INDEX "CatPhoto_catId_idx" ON "CatPhoto"("catId");

-- CreateIndex
CREATE INDEX "CatPhoto_createdByUserId_idx" ON "CatPhoto"("createdByUserId");

-- CreateIndex
CREATE INDEX "CatPhoto_deletedByUserId_idx" ON "CatPhoto"("deletedByUserId");

-- CreateIndex
CREATE INDEX "CatPhoto_deletedAt_idx" ON "CatPhoto"("deletedAt");

-- CreateIndex
CREATE INDEX "CatPhoto_createdAt_idx" ON "CatPhoto"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatDocument_key_key" ON "CatDocument"("key");

-- CreateIndex
CREATE INDEX "CatDocument_catId_idx" ON "CatDocument"("catId");

-- CreateIndex
CREATE INDEX "CatDocument_createdByUserId_idx" ON "CatDocument"("createdByUserId");

-- CreateIndex
CREATE INDEX "CatDocument_deletedByUserId_idx" ON "CatDocument"("deletedByUserId");

-- CreateIndex
CREATE INDEX "CatDocument_deletedAt_idx" ON "CatDocument"("deletedAt");

-- CreateIndex
CREATE INDEX "CatDocument_createdAt_idx" ON "CatDocument"("createdAt");

-- CreateIndex
CREATE INDEX "CatTag_name_idx" ON "CatTag"("name");

-- CreateIndex
CREATE INDEX "CatTag_isTest_idx" ON "CatTag"("isTest");

-- CreateIndex
CREATE INDEX "CatTag_deletedAt_idx" ON "CatTag"("deletedAt");

-- CreateIndex
CREATE INDEX "CatTagOnCat_tagId_idx" ON "CatTagOnCat"("tagId");

-- CreateIndex
CREATE INDEX "CatTagOnCat_deletedAt_idx" ON "CatTagOnCat"("deletedAt");

-- CreateIndex
CREATE INDEX "CatWeight_catId_idx" ON "CatWeight"("catId");

-- CreateIndex
CREATE INDEX "CatWeight_measuredAt_idx" ON "CatWeight"("measuredAt");

-- CreateIndex
CREATE INDEX "CatWeight_deletedAt_idx" ON "CatWeight"("deletedAt");

-- CreateIndex
CREATE INDEX "CatTreatment_catId_createdAt_idx" ON "CatTreatment"("catId", "createdAt");

-- CreateIndex
CREATE INDEX "CatTreatment_catId_startDate_endDate_idx" ON "CatTreatment"("catId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "CatTreatment_deletedAt_idx" ON "CatTreatment"("deletedAt");

-- CreateIndex
CREATE INDEX "CatTreatmentAdministration_checkedByUserId_idx" ON "CatTreatmentAdministration"("checkedByUserId");

-- CreateIndex
CREATE INDEX "CatTreatmentAdministration_treatmentId_administeredOn_idx" ON "CatTreatmentAdministration"("treatmentId", "administeredOn");

-- CreateIndex
CREATE INDEX "CatTreatmentAdministration_deletedAt_idx" ON "CatTreatmentAdministration"("deletedAt");

-- CreateIndex
CREATE INDEX "Flight_date_idx" ON "Flight"("date");

-- CreateIndex
CREATE INDEX "Flight_deletedAt_idx" ON "Flight"("deletedAt");

-- CreateIndex
CREATE INDEX "Flight_isTest_idx" ON "Flight"("isTest");

-- CreateIndex
CREATE INDEX "FlightCatAssignment_flightId_deletedAt_idx" ON "FlightCatAssignment"("flightId", "deletedAt");

-- CreateIndex
CREATE INDEX "FlightCatAssignment_catId_deletedAt_idx" ON "FlightCatAssignment"("catId", "deletedAt");

-- CreateIndex
CREATE INDEX "FlightCatAssignment_concurrencyToken_idx" ON "FlightCatAssignment"("concurrencyToken");

-- CreateIndex
CREATE INDEX "AuditEvent_catId_occurredAt_idx" ON "AuditEvent"("catId", "occurredAt");

-- CreateIndex
CREATE INDEX "AuditEvent_flightId_createdAt_idx" ON "AuditEvent"("flightId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_locationId_idx" ON "AuditEvent"("locationId");

-- CreateIndex
CREATE INDEX "AuditEvent_tagId_idx" ON "AuditEvent"("tagId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorUserId_idx" ON "AuditEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_eventType_idx" ON "AuditEvent"("eventType");

-- CreateIndex
CREATE INDEX "AuditEvent_isTest_idx" ON "AuditEvent"("isTest");

-- CreateIndex
CREATE INDEX "AuditEvent_weightId_idx" ON "AuditEvent"("weightId");

-- CreateIndex
CREATE INDEX "AuditEvent_taskId_idx" ON "AuditEvent"("taskId");

-- CreateIndex
CREATE INDEX "AuditEvent_medicalNoteId_idx" ON "AuditEvent"("medicalNoteId");

-- CreateIndex
CREATE INDEX "AuditEvent_preventiveTreatmentId_idx" ON "AuditEvent"("preventiveTreatmentId");

-- CreateIndex
CREATE INDEX "AuditEvent_noteId_idx" ON "AuditEvent"("noteId");

-- CreateIndex
CREATE INDEX "CatMedicalNote_catId_date_idx" ON "CatMedicalNote"("catId", "date");

-- CreateIndex
CREATE INDEX "CatMedicalNote_createdByUserId_idx" ON "CatMedicalNote"("createdByUserId");

-- CreateIndex
CREATE INDEX "CatMedicalNote_deletedAt_idx" ON "CatMedicalNote"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatMedicalNote_catId_createdByUserId_date_key" ON "CatMedicalNote"("catId", "createdByUserId", "date");

-- CreateIndex
CREATE INDEX "CatPreventiveTreatment_catId_date_idx" ON "CatPreventiveTreatment"("catId", "date");

-- CreateIndex
CREATE INDEX "CatPreventiveTreatment_deletedAt_idx" ON "CatPreventiveTreatment"("deletedAt");

-- CreateIndex
CREATE INDEX "CatNote_catId_date_idx" ON "CatNote"("catId", "date");

-- CreateIndex
CREATE INDEX "CatNote_createdByUserId_idx" ON "CatNote"("createdByUserId");

-- CreateIndex
CREATE INDEX "CatNote_deletedAt_idx" ON "CatNote"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatNote_catId_createdByUserId_date_key" ON "CatNote"("catId", "createdByUserId", "date");

-- CreateIndex
CREATE INDEX "CatTask_catId_dueDate_idx" ON "CatTask"("catId", "dueDate");

-- CreateIndex
CREATE INDEX "CatTask_deletedAt_completedAt_dueDate_idx" ON "CatTask"("deletedAt", "completedAt", "dueDate");

-- CreateIndex
CREATE INDEX "CatTask_completedByUserId_idx" ON "CatTask"("completedByUserId");

-- CreateIndex
CREATE INDEX "CatTask_deletedAt_idx" ON "CatTask"("deletedAt");

-- CreateIndex
CREATE INDEX "CatTask_notificationSentAt_idx" ON "CatTask"("notificationSentAt");

-- CreateIndex
CREATE INDEX "CatTaskReceiver_userId_idx" ON "CatTaskReceiver"("userId");

-- CreateIndex
CREATE INDEX "CatTaskReceiver_deletedAt_idx" ON "CatTaskReceiver"("deletedAt");

-- CreateIndex
CREATE INDEX "TaskNotification_userId_createdAt_idx" ON "TaskNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TaskNotification_deletedAt_idx" ON "TaskNotification"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaskNotification_taskId_userId_key" ON "TaskNotification"("taskId", "userId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat" ADD CONSTRAINT "Cat_archivingReasonId_fkey" FOREIGN KEY ("archivingReasonId") REFERENCES "CatArchivingReason"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat" ADD CONSTRAINT "Cat_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cat" ADD CONSTRAINT "Cat_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatPhoto" ADD CONSTRAINT "CatPhoto_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatPhoto" ADD CONSTRAINT "CatPhoto_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatPhoto" ADD CONSTRAINT "CatPhoto_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatDocument" ADD CONSTRAINT "CatDocument_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatDocument" ADD CONSTRAINT "CatDocument_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatDocument" ADD CONSTRAINT "CatDocument_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatTagOnCat" ADD CONSTRAINT "CatTagOnCat_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatTagOnCat" ADD CONSTRAINT "CatTagOnCat_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CatTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatWeight" ADD CONSTRAINT "CatWeight_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatTreatment" ADD CONSTRAINT "CatTreatment_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatTreatmentAdministration" ADD CONSTRAINT "CatTreatmentAdministration_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "CatTreatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatTreatmentAdministration" ADD CONSTRAINT "CatTreatmentAdministration_checkedByUserId_fkey" FOREIGN KEY ("checkedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightCatAssignment" ADD CONSTRAINT "FlightCatAssignment_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightCatAssignment" ADD CONSTRAINT "FlightCatAssignment_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "Flight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "FlightCatAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CatTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_archivingReasonId_fkey" FOREIGN KEY ("archivingReasonId") REFERENCES "CatArchivingReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "CatTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "CatPhoto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "CatDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_weightId_fkey" FOREIGN KEY ("weightId") REFERENCES "CatWeight"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CatTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_medicalNoteId_fkey" FOREIGN KEY ("medicalNoteId") REFERENCES "CatMedicalNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_preventiveTreatmentId_fkey" FOREIGN KEY ("preventiveTreatmentId") REFERENCES "CatPreventiveTreatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "CatNote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_relatedUserId_fkey" FOREIGN KEY ("relatedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatMedicalNote" ADD CONSTRAINT "CatMedicalNote_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatMedicalNote" ADD CONSTRAINT "CatMedicalNote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatPreventiveTreatment" ADD CONSTRAINT "CatPreventiveTreatment_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatNote" ADD CONSTRAINT "CatNote_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatNote" ADD CONSTRAINT "CatNote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatTask" ADD CONSTRAINT "CatTask_catId_fkey" FOREIGN KEY ("catId") REFERENCES "Cat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatTask" ADD CONSTRAINT "CatTask_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatTaskReceiver" ADD CONSTRAINT "CatTaskReceiver_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CatTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatTaskReceiver" ADD CONSTRAINT "CatTaskReceiver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskNotification" ADD CONSTRAINT "TaskNotification_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CatTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskNotification" ADD CONSTRAINT "TaskNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
