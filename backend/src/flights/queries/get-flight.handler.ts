import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class GetFlightHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(flightId: string, isTest: boolean) {
    const flight = await this.prisma.flight.findFirst({
      where: { id: flightId, isTest, deletedAt: null },
      select: {
        id: true,
        date: true,
        airport: true,
        flightNumber: true,
        flightParent: true,
        updatedAt: true,
        assignments: {
          where: { deletedAt: null },
          select: {
            id: true,
            f2fDone: true,
            tracesDone: true,
            cat: {
              select: {
                id: true,
                name: true,
                archivedAt: true,
                microchipNumber: true,
                passportNumber: true,
              },
            },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
      },
    });
    if (!flight) throw new NotFoundException("Flight not found");
    return {
      id: flight.id,
      date: flight.date.toISOString().slice(0, 10),
      airport: flight.airport,
      flightNumber: flight.flightNumber,
      flightParent: flight.flightParent,
      updatedAt: flight.updatedAt.toISOString(),
      cats: flight.assignments.map((assignment) => ({
        assignmentId: assignment.id,
        cat: assignment.cat,
        f2fDone: assignment.f2fDone,
        tracesDone: assignment.tracesDone,
      })),
    };
  }
}
