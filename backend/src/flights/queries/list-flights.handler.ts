import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CatPhotoUrlService } from "../../cats/cat-photo-url.service";

export type FlightListItem = {
  id: string;
  date: string;
  airport: string;
  flightNumber: string | null;
  flightParent: string | null;
  comment: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  catCount: number;
  assignedCats: {
    id: string;
    name: string;
    nameNumber: number;
    primaryPhotoUrl: string | null;
  }[];
};

@Injectable()
export class ListFlightsHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(
    isTest: boolean,
    includeDeleted: boolean,
  ): Promise<FlightListItem[]> {
    const flights = await this.prisma.flight.findMany({
      where: includeDeleted
        ? {
            isTest,
            OR: [{ deletedAt: { not: null } }, { archivedAt: { not: null } }],
          }
        : { isTest, deletedAt: null, archivedAt: null },
      select: {
        id: true,
        date: true,
        airport: true,
        flightNumber: true,
        flightParent: true,
        comment: true,
        deletedAt: true,
        archivedAt: true,
        assignments: {
          where: { deletedAt: null },
          select: {
            cat: {
              select: {
                id: true,
                name: true,
                nameNumber: true,
                primaryPhotoKey: true,
              },
            },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
      orderBy: [{ date: "asc" }, { flightNumber: "asc" }, { id: "asc" }],
    });
    return Promise.all(
      flights.map(async (flight) => ({
        id: flight.id,
        date: flight.date.toISOString().slice(0, 10),
        airport: flight.airport,
        flightNumber: flight.flightNumber,
        flightParent: flight.flightParent,
        comment: flight.comment,
        deletedAt: flight.deletedAt?.toISOString() ?? null,
        archivedAt: flight.archivedAt?.toISOString() ?? null,
        catCount: flight.assignments.length,
        assignedCats: await Promise.all(
          flight.assignments.map(async ({ cat }) => ({
            id: cat.id,
            name: cat.name,
            nameNumber: cat.nameNumber,
            primaryPhotoUrl: await this.photoUrls.getPreviewPhotoUrl(
              cat.primaryPhotoKey,
            ),
          })),
        ),
      })),
    );
  }
}
