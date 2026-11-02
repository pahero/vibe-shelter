import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class DeleteFlightPhotoHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(
    flightId: string,
    photoId: string,
    actorUserId: string,
    isTest: boolean,
  ): Promise<void> {
    if (!flightId?.trim())
      throw new BadRequestException("Flight ID is required");
    if (!photoId?.trim()) throw new BadRequestException("Photo ID is required");
    await runInNewTransaction(this.prisma, async (tx) => {
      const flight = await tx.flight.findFirst({
        where: { id: flightId, isTest, deletedAt: null },
        select: { id: true },
      });
      if (!flight) throw new NotFoundException("Flight not found");
      const photo = await tx.flightPhoto.findFirst({
        where: { id: photoId, flightId, deletedAt: null },
        select: { id: true },
      });
      if (!photo) throw new NotFoundException("Photo not found");
      await tx.flightPhoto.update({
        where: { id: photoId },
        data: { deletedAt: new Date(), concurrencyToken: crypto.randomUUID() },
      });
      await tx.flight.update({
        where: { id: flightId },
        data: { concurrencyToken: crypto.randomUUID() },
      });
      await tx.auditEvent.create({
        data: {
          flightId,
          flightPhotoId: photoId,
          actorUserId,
          eventType: "flight_photo_deleted",
        },
      });
    });
  }
}
