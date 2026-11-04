import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { UpdateFlightCommand } from "./update-flight.command";

@Injectable()
export class UpdateFlightHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(command: UpdateFlightCommand): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const flight = await transaction.flight.findFirst({
        where: {
          id: command.flightId,
          isTest: command.isTest,
          deletedAt: null,
        },
        select: {
          id: true,
          date: true,
          airport: true,
          flightNumber: true,
          flightParent: true,
          comment: true,
        },
      });
      if (!flight) throw new NotFoundException("Flight not found");

      const data: {
        date?: Date;
        airport?: string;
        flightNumber?: string | null;
        flightParent?: string | null;
        comment?: string | null;
        concurrencyToken?: string;
      } = {};
      const changes: {
        eventType: string;
        oldValue: string;
        newValue: string;
      }[] = [];
      if (
        command.date !== undefined &&
        command.date.getTime() !== flight.date.getTime()
      ) {
        data.date = command.date;
        changes.push({
          eventType: "flight_date_changed",
          oldValue: flight.date.toISOString().slice(0, 10),
          newValue: command.date.toISOString().slice(0, 10),
        });
      }
      if (command.airport !== undefined && command.airport !== flight.airport) {
        data.airport = command.airport;
        changes.push({
          eventType: "flight_airport_changed",
          oldValue: flight.airport,
          newValue: command.airport,
        });
      }
      if (
        command.flightNumber !== undefined &&
        command.flightNumber !== flight.flightNumber
      ) {
        data.flightNumber = command.flightNumber;
        changes.push({
          eventType: "flight_number_changed",
          oldValue: flight.flightNumber ?? "No flight number",
          newValue: command.flightNumber ?? "No flight number",
        });
      }
      if (command.comment !== undefined && command.comment !== flight.comment) {
        data.comment = command.comment;
        changes.push({
          eventType: "flight_comment_changed",
          oldValue: flight.comment ?? "No comment",
          newValue: command.comment ?? "No comment",
        });
      }
      if (
        command.flightParent !== undefined &&
        command.flightParent !== flight.flightParent
      ) {
        data.flightParent = command.flightParent;
        changes.push({
          eventType: "flight_parent_changed",
          oldValue: flight.flightParent ?? "No flight parent",
          newValue: command.flightParent ?? "No flight parent",
        });
      }

      if (changes.length > 0) {
        data.concurrencyToken = crypto.randomUUID();
        await transaction.flight.update({ where: { id: flight.id }, data });
        await transaction.auditEvent.createMany({
          data: changes.map((change) => ({
            flightId: flight.id,
            actorUserId: command.actorUserId,
            ...change,
          })),
        });
      }
      return { id: flight.id };
    });
  }
}
