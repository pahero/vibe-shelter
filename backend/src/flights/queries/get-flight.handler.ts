import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class GetFlightHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(flightId: string, isTest: boolean) {
    const flight = await this.prisma.flight.findFirst({
      where: { id: flightId, isTest },
      select: {
        id: true,
        date: true,
        airport: true,
        flightNumber: true,
        flightParent: true,
        comment: true,
        updatedAt: true,
        archivedAt: true,
        deletedAt: true,
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
                nameNumber: true,
                archivedAt: true,
                microchipNumber: true,
                passport: true,
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
      comment: flight.comment,
      updatedAt: flight.updatedAt.toISOString(),
      archivedAt: flight.archivedAt?.toISOString() ?? null,
      deletedAt: flight.deletedAt?.toISOString() ?? null,
      cats: flight.assignments.map((assignment) => ({
        assignmentId: assignment.id,
        cat: assignment.cat,
        f2fDone: assignment.f2fDone,
        tracesDone: assignment.tracesDone,
      })),
    };
  }
}
