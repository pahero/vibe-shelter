import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class RestoreFlightCatAssignmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    assignmentId: string,
    actorUserId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const assignment = await transaction.flightCatAssignment.findFirst({
        where: {
          id: assignmentId,
          deletedAt: { not: null },
          flight: { isTest, deletedAt: null },
          cat: { archivedAt: null },
        },
        select: { id: true, flightId: true, catId: true },
      });
      if (!assignment)
        throw new NotFoundException("Deleted flight cat assignment not found");
      const activeAssignment = await transaction.flightCatAssignment.findFirst({
        where: {
          flightId: assignment.flightId,
          catId: assignment.catId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (activeAssignment)
        throw new ConflictException("Cat is already assigned to this flight");
      await transaction.flightCatAssignment.update({
        where: { id: assignment.id },
        data: { deletedAt: null, concurrencyToken: crypto.randomUUID() },
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
          eventType: "flight_cat_restored",
        },
      });
      return { id: assignment.id };
    });
  }
}
