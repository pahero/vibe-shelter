import { Injectable } from "@nestjs/common";
import { VaccinationType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";

export type FlightCandidate = {
  id: string;
  name: string;
  currentLocationName: string | null;
  archivedAt: string | null;
  microchipNumber: string | null;
  passport: boolean;
  sponsorName: string | null;
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
      where: { isTest, archivedAt: null, deletedAt: null },
      select: {
        id: true,
        name: true,
        archivedAt: true,
        microchipNumber: true,
        passport: true,
        sponsorName: true,
        adopterName: true,
        adopterAddress: true,
        felvFivTestDone: true,
        currentLocation: { select: { name: true } },
        vaccinations: {
          where: { deletedAt: null },
          select: { type: true },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return cats.map((cat) => {
      const coreVaccineCount = cat.vaccinations.filter(({ type }) => type === VaccinationType.CORE).length;
      return {
        id: cat.id,
        name: cat.name,
        currentLocationName: cat.currentLocation?.name ?? null,
        archivedAt: cat.archivedAt?.toISOString() ?? null,
        microchipNumber: cat.microchipNumber,
        passport: cat.passport,
        sponsorName: cat.sponsorName,
        adopterName: cat.adopterName,
        adopterAddress: cat.adopterAddress,
        requirements: {
          firstVaccine: coreVaccineCount >= 1,
          secondVaccine: coreVaccineCount >= 2,
          rabies: cat.vaccinations.some(({ type }) => type === VaccinationType.RABIES),
          passport: cat.passport,
          chipped: cat.microchipNumber !== null,
          adopter: Boolean(cat.adopterName && cat.adopterAddress),
          felvFivTestDone: cat.felvFivTestDone,
        },
      };
    });
  }
}
