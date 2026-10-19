import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { CAT_CARD_INCLUDE } from "../cats.types";
import { toCatCard } from "../cats.mappers";
import { validateCatId } from "../cats.handler-utils";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";

@Injectable()
export class SetPrimaryCatPhotoHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(
    catId: string,
    photoId: string,
    positionY: number | null | undefined,
    actorUserId: string | undefined,
    isTest: boolean,
  ) {
    validateCatId(catId);
    validateCatId(photoId, "Photo ID");
    const cat = await this.prisma.cat.findFirst({
      where: { id: catId, isTest },
      select: { id: true, primaryPhotoKey: true },
    });
    if (!cat) throw new NotFoundException("Cat not found");
    const photo = await this.prisma.catPhoto.findFirst({
      where: { id: photoId, catId, deletedAt: null },
      select: { id: true, key: true },
    });
    if (!photo) throw new NotFoundException("Photo not found");
    const data = {
      primaryPhotoKey: photo.key,
      ...(positionY !== undefined
        ? { primaryPhotoPositionY: positionY }
        : cat.primaryPhotoKey !== photo.key
          ? { primaryPhotoPositionY: null }
          : {}),
    };
    const updated = cat.primaryPhotoKey !== photo.key && actorUserId
      ? await runInNewTransaction(this.prisma, async (tx) => {
          const record = await tx.cat.update({
            where: { id: catId },
            data,
            include: CAT_CARD_INCLUDE,
          });
          const photoName = (key: string | null) => {
            if (!key) return "No photo";
            return (key.split("/").at(-2) ?? key.split("/").at(-1) ?? key)
              .replace(/^\d+-(?:[0-9a-f-]{36}-)?/i, "");
          };
          await tx.auditEvent.create({
            data: {
              catId,
              photoId: photo.id,
              actorUserId,
              isTest,
              eventType: CAT_AUDIT_EVENT_TYPES.primaryPhotoChanged,
              oldValue: photoName(cat.primaryPhotoKey),
              newValue: photoName(photo.key),
            },
          });
          return record;
        })
      : await this.prisma.cat.update({
          where: { id: catId },
          data,
          include: CAT_CARD_INCLUDE,
        });
    return toCatCard(updated, this.photoUrls);
  }
}
