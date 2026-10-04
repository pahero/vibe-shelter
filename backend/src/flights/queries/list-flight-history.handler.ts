import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class ListFlightHistoryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(flightId: string, isTest: boolean) {
    const flight = await this.prisma.flight.findFirst({
      where: { id: flightId, isTest },
      select: { id: true },
    });
    if (!flight) throw new NotFoundException("Flight not found");

    const events = await this.prisma.auditEvent.findMany({
      where: { flightId },
      include: {
        actorUser: { select: { id: true, fullName: true, email: true } },
        cat: { select: { id: true, name: true, archivedAt: true } },
        flight: {
          select: {
            id: true,
            flightNumber: true,
            airport: true,
            date: true,
            deletedAt: true,
          },
        },
        assignment: {
          select: {
            id: true,
            f2fDone: true,
            tracesDone: true,
            deletedAt: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    return events.map((event) => ({
      id: event.id,
      flightId: event.flightId,
      eventType: event.eventType,
      createdAt: event.createdAt.toISOString(),
      actor: {
        id: event.actorUser.id,
        displayName: event.actorUser.fullName || event.actorUser.email,
        email: event.actorUser.email,
      },
      oldValue: event.oldValue,
      newValue: event.newValue,
      cat: event.cat
        ? {
            id: event.cat.id,
            name: event.cat.name,
            archivedAt: event.cat.archivedAt?.toISOString() ?? null,
          }
        : null,
      flight: {
        id: event.flight!.id,
        flightNumber: event.flight!.flightNumber,
        airport: event.flight!.airport,
        date: event.flight!.date.toISOString().slice(0, 10),
        isDeleted: event.flight!.deletedAt !== null,
      },
      assignment: event.assignment
        ? {
            id: event.assignment.id,
            f2fDone: event.assignment.f2fDone,
            tracesDone: event.assignment.tracesDone,
            isDeleted: event.assignment.deletedAt !== null,
          }
        : null,
    }));
  }
}
