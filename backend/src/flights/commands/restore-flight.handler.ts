import { Injectable, NotFoundException } from "@nestjs/common";
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
        where: { id: flightId, isTest, deletedAt: { not: null } },
        select: { id: true },
      });
      if (!flight) throw new NotFoundException("Deleted flight not found");
      await transaction.flight.update({
        where: { id: flight.id },
        data: { deletedAt: null, concurrencyToken: crypto.randomUUID() },
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
