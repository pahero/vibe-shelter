import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { CAT_CARD_INCLUDE } from "../cats.types";
import { toCatCard } from "../cats.mappers";
import { validateCatId } from "../cats.handler-utils";

@Injectable()
export class DeleteCatPhotoHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(
    catId: string,
    photoId: string,
    actorUserId: string | undefined,
    isTest: boolean,
  ) {
    validateCatId(catId);
    validateCatId(photoId, "Photo ID");
    return runInNewTransaction(this.prisma, async (tx) => {
      const cat = await tx.cat.findFirst({
        where: { id: catId, isTest },
        select: { primaryPhotoKey: true },
      });
      if (!cat) throw new NotFoundException("Cat not found");
      const photo = await tx.catPhoto.findFirst({
        where: { id: photoId, catId, deletedAt: null },
        select: { key: true },
      });
      if (!photo) throw new NotFoundException("Photo not found");
      await tx.catPhoto.update({
        where: { id: photoId },
        data: {
          deletedAt: new Date(),
          deletedByUserId: actorUserId ?? null,
          version: { increment: 1 },
        },
      });
      if (cat.primaryPhotoKey === photo.key) {
        const nextPhoto = await tx.catPhoto.findFirst({
          where: { catId, id: { not: photoId }, deletedAt: null },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        });
        await tx.cat.update({
          where: { id: catId },
          data: { primaryPhotoKey: nextPhoto?.key ?? null },
        });
      }
      if (actorUserId)
        await tx.auditEvent.create({
          data: {
            catId,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.photoDeleted,
            photoId,
          },
        });
      const updated = await tx.cat.findFirst({
        where: { id: catId, isTest },
        include: CAT_CARD_INCLUDE,
      });
      if (!updated) throw new NotFoundException("Cat not found");
      return toCatCard(updated, this.photoUrls);
    });
  }
}
