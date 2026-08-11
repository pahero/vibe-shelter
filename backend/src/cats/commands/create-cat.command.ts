import { CatSex, SterilizationStatus } from '@prisma/client';

export class CreateCatCommand {
  constructor(
    readonly name: string,
    readonly sex: CatSex,
    readonly color: string | null,
    readonly estimatedBirthDate: Date | null,
    readonly intakeDate: Date | null,
    readonly rescueSource: string | null,
    readonly microchipNumber: string | null,
    readonly passportNumber: string | null,
    readonly sterilizationStatus: SterilizationStatus,
    readonly currentLocationId: string | null,
    readonly createdByUserId: string,
  ) {}
}
