import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { AssignCatToFlightCommand } from "./assign-cat-to-flight.command";

@Injectable()
export class AssignCatToFlightHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(command: AssignCatToFlightCommand): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const flight = await transaction.flight.findFirst({
        where: { id: command.flightId, isTest: command.isTest, deletedAt: null },
        select: { id: true },
      });
      if (!flight) throw new NotFoundException("Flight not found");
      const cat = await transaction.cat.findFirst({
        where: { id: command.catId, isTest: command.isTest, archivedAt: null },
        select: { id: true },
      });
      if (!cat) throw new NotFoundException("Active cat not found");
      const existing = await transaction.flightCatAssignment.findFirst({
        where: { flightId: flight.id, catId: cat.id, deletedAt: null },
        select: { id: true },
      });
      if (existing) throw new ConflictException("Cat is already assigned to this flight");

      const assignment = await transaction.flightCatAssignment.create({
        data: { flightId: flight.id, catId: cat.id },
        select: { id: true },
      });
      await transaction.flight.update({ where: { id: flight.id }, data: { concurrencyToken: crypto.randomUUID() } });
      await transaction.flightAuditEvent.create({
        data: {
          flightId: flight.id,
          catId: cat.id,
          assignmentId: assignment.id,
          actorUserId: command.actorUserId,
          eventType: "flight_cat_assigned",
        },
      });
      return { id: assignment.id };
    });
  }
}
