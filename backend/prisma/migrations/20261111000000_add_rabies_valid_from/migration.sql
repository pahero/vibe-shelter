ALTER TABLE "Vaccination" ADD COLUMN "validFrom" DATE;
ALTER TABLE "Cat"
  ADD COLUMN "preparationFeePrice" DECIMAL(10,2),
  ADD COLUMN "preparationFeePaid" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "flightFeePrice" DECIMAL(10,2),
  ADD COLUMN "flightFeePaid" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "prePayerName" TEXT,
  ADD COLUMN "paidByAdopter" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "adoptionContract" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "adoptionForm" BOOLEAN NOT NULL DEFAULT false;
