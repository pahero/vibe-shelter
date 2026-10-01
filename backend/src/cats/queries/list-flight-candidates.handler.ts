import { Injectable } from "@nestjs/common";
import { PreventiveTreatmentType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";

export type FlightCandidate = {
  id: string;
  name: string;
  currentLocationName: string | null;
  archivedAt: string | null;
  microchipNumber: string | null;
  passportNumber: string | null;
  adopterName: string | null;
  adopterAddress: string | null;
  requirements: {
    firstVaccine: boolean;
    secondVaccine: boolean;
    rabies: boolean;
    passport: boolean;
    chipped: boolean;
    adopter: boolean;
    felvFivTestDone: boolean;
  };
};

@Injectable()
export class ListFlightCandidatesHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(isTest: boolean): Promise<FlightCandidate[]> {
    const cats = await this.prisma.cat.findMany({
      where: { isTest },
      select: {
        id: true,
        name: true,
        archivedAt: true,
        microchipNumber: true,
        passportNumber: true,
        adopterName: true,
        adopterAddress: true,
        felvFivTestDone: true,
        currentLocation: { select: { name: true } },
        preventiveTreatments: {
          where: { deletedAt: null },
          select: { type: true },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return cats.map((cat) => {
      const treatmentTypes = new Set(
        cat.preventiveTreatments.map(({ type }) => type),
      );
      return {
        id: cat.id,
        name: cat.name,
        currentLocationName: cat.currentLocation?.name ?? null,
        archivedAt: cat.archivedAt?.toISOString() ?? null,
        microchipNumber: cat.microchipNumber,
        passportNumber: cat.passportNumber,
        adopterName: cat.adopterName,
        adopterAddress: cat.adopterAddress,
        requirements: {
          firstVaccine: treatmentTypes.has(
            PreventiveTreatmentType.FIRST_VACCINE,
          ),
          secondVaccine: treatmentTypes.has(
            PreventiveTreatmentType.SECOND_VACCINE,
          ),
          rabies: treatmentTypes.has(PreventiveTreatmentType.RABIES),
          passport: cat.passportNumber !== null,
          chipped: cat.microchipNumber !== null,
          adopter: Boolean(cat.adopterName && cat.adopterAddress),
          felvFivTestDone: cat.felvFivTestDone,
        },
      };
    });
  }
}
