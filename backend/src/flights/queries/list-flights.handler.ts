import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

export type FlightListItem = {
  id: string;
  date: string;
  airport: string;
  flightNumber: string;
  flightParent: string;
  deletedAt: string | null;
  catCount: number;
};

@Injectable()
export class ListFlightsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(isTest: boolean, includeDeleted: boolean): Promise<FlightListItem[]> {
    const flights = await this.prisma.flight.findMany({
      where: { isTest, deletedAt: includeDeleted ? { not: null } : null },
      select: {
        id: true,
        date: true,
        airport: true,
        flightNumber: true,
        flightParent: true,
        deletedAt: true,
        assignments: { where: { deletedAt: null }, select: { id: true } },
      },
      orderBy: [{ date: "asc" }, { flightNumber: "asc" }, { id: "asc" }],
    });
    return flights.map((flight) => ({
      id: flight.id,
      date: flight.date.toISOString().slice(0, 10),
      airport: flight.airport,
      flightNumber: flight.flightNumber,
      flightParent: flight.flightParent,
      deletedAt: flight.deletedAt?.toISOString() ?? null,
      catCount: flight.assignments.length,
    }));
  }
}
