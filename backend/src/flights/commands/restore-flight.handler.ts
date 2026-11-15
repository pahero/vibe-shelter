import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class RestoreFlightHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    flightId: string,
    actorUserId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const flight = await transaction.flight.findFirst({
        where: {
          id: flightId,
          isTest,
          OR: [{ deletedAt: { not: null } }, { archivedAt: { not: null } }],
        },
        select: { id: true },
      });
      if (!flight) throw new NotFoundException("Deleted flight not found");
      const assignments = await transaction.flightCatAssignment.findMany({
        where: { flightId: flight.id, deletedAt: null },
        select: { catId: true },
      });
      if (assignments.length > 0) {
        const conflictingAssignment =
          await transaction.flightCatAssignment.findFirst({
            where: {
              flightId: { not: flight.id },
              catId: { in: assignments.map(({ catId }) => catId) },
              deletedAt: null,
              cat: { is: { isTest } },
              flight: {
                is: { isTest, deletedAt: null, archivedAt: null },
              },
            },
            select: {
              cat: { select: { name: true, nameNumber: true } },
            },
          });
        if (conflictingAssignment) {
          throw new ConflictException(
            `Cannot restore this flight because ${conflictingAssignment.cat.name} #${conflictingAssignment.cat.nameNumber} is assigned to another active flight. Remove the cat from that flight first.`,
          );
        }
      }
      for (const { catId } of assignments) {
        const updatedCat = await transaction.cat.updateMany({
          where: { id: catId, isTest, isFlightCandidate: false },
          data: {
            isFlightCandidate: true,
            concurrencyToken: crypto.randomUUID(),
          },
        });
        if (updatedCat.count === 1) {
          await transaction.auditEvent.create({
            data: {
              flightId: flight.id,
              catId,
              actorUserId,
              isTest,
              eventType: "flight_candidate_changed",
              oldValue: "false",
              newValue: "true",
            },
          });
        }
      }
      await transaction.flight.update({
        where: { id: flight.id },
        data: {
          archivedAt: null,
          deletedAt: null,
          concurrencyToken: crypto.randomUUID(),
        },
      });
      await transaction.auditEvent.create({
        data: {
          flightId: flight.id,
          actorUserId,
          eventType: "flight_restored",
        },
      });
      return { id: flight.id };
    });
  }
}
