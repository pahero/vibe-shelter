import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CreateFlightCommand } from "./create-flight.command";

@Injectable()
export class CreateFlightHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(command: CreateFlightCommand): Promise<{ id: string }> {
    return runInNewTransaction(this.prisma, async (transaction) => {
      const flight = await transaction.flight.create({
        data: {
          date: command.date,
          airport: command.airport,
          flightNumber: command.flightNumber,
          flightParent: command.flightParent,
          isTest: command.isTest,
        },
        select: { id: true },
      });
      await transaction.flightAuditEvent.create({
        data: { flightId: flight.id, actorUserId: command.actorUserId, eventType: "flight_created" },
      });
      return { id: flight.id };
    });
  }
}
