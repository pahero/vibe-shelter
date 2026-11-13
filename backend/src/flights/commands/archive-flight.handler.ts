import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class ArchiveFlightHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    flightId: string,
    actorUserId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const flight = await transaction.flight.findFirst({
        where: { id: flightId, isTest, archivedAt: null, deletedAt: null },
        select: { id: true },
      });
      if (!flight) throw new NotFoundException("Flight not found");
      const assignments = await transaction.flightCatAssignment.findMany({
        where: {
          flightId: flight.id,
          deletedAt: null,
          cat: { isFlightCandidate: true, isTest },
        },
        select: { cat: { select: { id: true } } },
      });
      for (const { cat } of assignments) {
        const updated = await transaction.cat.updateMany({
          where: { id: cat.id, isTest, isFlightCandidate: true },
          data: {
            isFlightCandidate: false,
            concurrencyToken: crypto.randomUUID(),
          },
        });
        if (updated.count === 1) {
          await transaction.auditEvent.create({
            data: {
              catId: cat.id,
              actorUserId,
              eventType: "flight_candidate_changed",
              oldValue: "true",
              newValue: "false",
            },
          });
        }
      }
      await transaction.flight.update({
        where: { id: flight.id },
        data: { archivedAt: new Date(), concurrencyToken: crypto.randomUUID() },
      });
      await transaction.auditEvent.create({
        data: {
          flightId: flight.id,
          actorUserId,
          eventType: "flight_archived",
        },
      });
      return { id: flight.id };
    });
  }
}
