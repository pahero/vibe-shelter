import { Injectable, NotFoundException } from "@nestjs/common";
import { FlightAuditEventType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { UpdateFlightCatAssignmentCommand } from "./update-flight-cat-assignment.command";

@Injectable()
export class UpdateFlightCatAssignmentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    command: UpdateFlightCatAssignmentCommand,
  ): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const assignment = await transaction.flightCatAssignment.findFirst({
        where: {
          id: command.assignmentId,
          deletedAt: null,
          flight: { isTest: command.isTest, deletedAt: null },
        },
        select: {
          id: true,
          flightId: true,
          catId: true,
          f2fDone: true,
          tracesDone: true,
        },
      });
      if (!assignment)
        throw new NotFoundException("Flight cat assignment not found");

      const data: { f2fDone?: boolean; tracesDone?: boolean } = {};
      const changes: {
        eventType: FlightAuditEventType;
        oldValue: string;
        newValue: string;
      }[] = [];
      if (
        command.f2fDone !== undefined &&
        command.f2fDone !== assignment.f2fDone
      ) {
        data.f2fDone = command.f2fDone;
        changes.push({
          eventType: "flight_cat_f2f_changed",
          oldValue: String(assignment.f2fDone),
          newValue: String(command.f2fDone),
        });
      }
      if (
        command.tracesDone !== undefined &&
        command.tracesDone !== assignment.tracesDone
      ) {
        data.tracesDone = command.tracesDone;
        changes.push({
          eventType: "flight_cat_traces_changed",
          oldValue: String(assignment.tracesDone),
          newValue: String(command.tracesDone),
        });
      }

      if (changes.length > 0) {
        await transaction.flightCatAssignment.update({
          where: { id: assignment.id },
          data: { ...data, concurrencyToken: crypto.randomUUID() },
        });
        await transaction.flight.update({
          where: { id: assignment.flightId },
          data: { concurrencyToken: crypto.randomUUID() },
        });
        await transaction.flightAuditEvent.createMany({
          data: changes.map((change) => ({
            flightId: assignment.flightId,
            catId: assignment.catId,
            assignmentId: assignment.id,
            actorUserId: command.actorUserId,
            ...change,
          })),
        });
      }
      return { id: assignment.id };
    });
  }
}
