-- CreateEnum
CREATE TYPE "CatSex" AS ENUM ('FEMALE', 'MALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SterilizationStatus" AS ENUM ('STERILIZED', 'NOT_STERILIZED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CatStatus" AS ENUM ('ACTIVE', 'ADOPTED', 'DECEASED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Cat" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sex" "CatSex" NOT NULL DEFAULT 'UNKNOWN',
    "color" TEXT,
    "estimatedBirthDate" TIMESTAMP(3),
    "intakeDate" TIMESTAMP(3),
    "rescueSource" TEXT,
    "microchipNumber" TEXT,
    "passportNumber" TEXT,
    "sterilizationStatus" "SterilizationStatus" NOT NULL DEFAULT 'UNKNOWN',
    "status" "CatStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentLocationId" TEXT,
    "primaryPhotoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cat_microchipNumber_key" ON "Cat"("microchipNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Cat_passportNumber_key" ON "Cat"("passportNumber");

-- CreateIndex
CREATE INDEX "Cat_currentLocationId_idx" ON "Cat"("currentLocationId");

-- CreateIndex
CREATE INDEX "Cat_status_idx" ON "Cat"("status");

-- CreateIndex
CREATE INDEX "Cat_name_idx" ON "Cat"("name");

-- CreateIndex
CREATE INDEX "Cat_intakeDate_idx" ON "Cat"("intakeDate");

-- AddForeignKey
ALTER TABLE "Cat" ADD CONSTRAINT "Cat_currentLocationId_fkey" FOREIGN KEY ("currentLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
