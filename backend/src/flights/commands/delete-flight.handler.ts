import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class DeleteFlightHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(flightId: string, actorUserId: string, isTest: boolean): Promise<void> {
    await runInNewTransaction(this.prisma, async (transaction) => {
      const flight = await transaction.flight.findFirst({
        where: { id: flightId, isTest, deletedAt: null },
        select: { id: true },
      });
      if (!flight) throw new NotFoundException("Flight not found");
      await transaction.flight.update({
        where: { id: flight.id },
        data: { deletedAt: new Date(), concurrencyToken: crypto.randomUUID() },
      });
      await transaction.flightAuditEvent.create({
        data: { flightId: flight.id, actorUserId, eventType: "flight_deleted" },
      });
    });
  }
}
