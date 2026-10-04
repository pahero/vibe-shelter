import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class DeleteFlightCatAssignmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    assignmentId: string,
    actorUserId: string,
    isTest: boolean,
  ): Promise<void> {
    await runInNewTransaction(this.prisma, async (transaction) => {
      const assignment = await transaction.flightCatAssignment.findFirst({
        where: {
          id: assignmentId,
          deletedAt: null,
          flight: { isTest, deletedAt: null },
        },
        select: { id: true, flightId: true, catId: true },
      });
      if (!assignment)
        throw new NotFoundException("Flight cat assignment not found");
      await transaction.flightCatAssignment.update({
        where: { id: assignment.id },
        data: { deletedAt: new Date(), concurrencyToken: crypto.randomUUID() },
      });
      await transaction.flight.update({
        where: { id: assignment.flightId },
        data: { concurrencyToken: crypto.randomUUID() },
      });
      await transaction.auditEvent.create({
        data: {
          flightId: assignment.flightId,
          catId: assignment.catId,
          assignmentId: assignment.id,
          actorUserId,
          eventType: "flight_cat_unassigned",
        },
      });
    });
  }
}
