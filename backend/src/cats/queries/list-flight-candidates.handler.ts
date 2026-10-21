import { Injectable } from "@nestjs/common";
import { VaccinationType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { CatPhotoUrlService } from "../cat-photo-url.service";

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
  primaryPhotoUrl: string | null;
  flights: {
    id: string;
    flightNumber: string;
  }[];
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(isTest: boolean): Promise<FlightCandidate[]> {
    const cats = await this.prisma.cat.findMany({
      where: { isTest, archivedAt: null, deletedAt: null, isFlightCandidate: true },
      select: {
        id: true,
        name: true,
        primaryPhotoKey: true,
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
        flightAssignments: {
          where: { deletedAt: null, flight: { deletedAt: null } },
          select: {
            flight: { select: { id: true, flightNumber: true, deletedAt: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return Promise.all(cats.map(async (cat) => {
      const coreVaccineCount = cat.vaccinations.filter(({ type }) => type === VaccinationType.CORE).length;
      return {
        id: cat.id,
        name: cat.name,
        primaryPhotoUrl: await this.photoUrls.getPrimaryPhotoUrl(cat.primaryPhotoKey),
        currentLocationName: cat.currentLocation?.name ?? null,
        archivedAt: cat.archivedAt?.toISOString() ?? null,
        microchipNumber: cat.microchipNumber,
        passport: cat.passport,
        sponsorName: cat.sponsorName,
        adopterName: cat.adopterName,
        adopterAddress: cat.adopterAddress,
        flights: cat.flightAssignments.map(({ flight }) => ({
          id: flight.id,
          flightNumber: flight.flightNumber,
        })),
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
    }));
  }
}
