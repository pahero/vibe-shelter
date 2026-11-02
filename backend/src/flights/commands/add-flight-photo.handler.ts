import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CatPhotoCompressionService } from "../../cats/cat-photo-compression.service";
import { CatPhotoUrlService } from "../../cats/cat-photo-url.service";
import { PrimaryPhotoUpload } from "../../cats/cats.types";

@Injectable()
export class AddFlightPhotoHandler {
  constructor(private readonly prisma: PrismaService, private readonly photoUrls: CatPhotoUrlService) {}

  async handle(flightId: string, photo: PrimaryPhotoUpload | undefined, actorUserId: string, isTest: boolean) {
    if (!flightId?.trim()) throw new BadRequestException("Flight ID is required");
    if (!photo?.buffer?.length) throw new BadRequestException("Photo file is required");
    if (!photo.mimetype?.startsWith("image/")) throw new BadRequestException("Only image files are supported");
    const flight = await this.prisma.flight.findFirst({ where: { id: flightId, isTest, deletedAt: null }, select: { id: true } });
    if (!flight) throw new NotFoundException("Flight not found");

    const compressed = await CatPhotoCompressionService.compress(photo);
    const uploaded = await this.photoUrls.uploadFlightPhotoVariants({
      flightId,
      originalName: compressed.full.originalname,
      contentType: compressed.full.mimetype,
      fullBody: compressed.full.buffer,
      previewBody: compressed.preview.buffer,
    });
    const created = await runInNewTransaction(this.prisma, async (tx) => {
      const activeFlight = await tx.flight.findFirst({ where: { id: flightId, isTest, deletedAt: null }, select: { id: true } });
      if (!activeFlight) throw new NotFoundException("Flight not found");
      const result = await tx.flightPhoto.create({ data: { flightId, key: uploaded.key, previewKey: uploaded.previewKey } });
      await tx.flight.update({ where: { id: flightId }, data: { concurrencyToken: crypto.randomUUID() } });
      await tx.auditEvent.create({ data: { flightId, flightPhotoId: result.id, actorUserId, eventType: "flight_photo_created" } });
      return result;
    });
    return {
      id: created.id,
      flightId: created.flightId,
      url: await this.photoUrls.getPhotoUrl(created.previewKey ?? created.key),
      fullUrl: await this.photoUrls.getPhotoUrl(created.key),
      createdAt: created.createdAt.toISOString(),
    };
  }
}
