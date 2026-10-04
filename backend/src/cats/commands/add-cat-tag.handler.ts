import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { CAT_CARD_INCLUDE } from "../cats.types";
import { toCatCard } from "../cats.mappers";
import { validateCatId } from "../cats.handler-utils";

@Injectable()
export class AddCatTagHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(
    catId: string,
    tagId: string,
    actorUserId: string | undefined,
    isTest: boolean,
  ) {
    validateCatId(catId);
    validateCatId(tagId, "Tag ID");
    return runInNewTransaction(this.prisma, async (tx) => {
      const cat = await tx.cat.findFirst({
        where: { id: catId, isTest },
        select: { id: true },
      });
      if (!cat) throw new NotFoundException("Cat not found");
      const tag = await tx.catTag.findFirst({
        where: { id: tagId, deletedAt: null, isTest },
        select: { id: true },
      });
      if (!tag) throw new NotFoundException("Tag not found");
      const assignment = await tx.catTagOnCat.findUnique({
        where: { catId_tagId: { catId, tagId } },
        select: { deletedAt: true },
      });
      if (!assignment) {
        await tx.catTagOnCat.create({ data: { catId, tagId } });
        await tx.catTag.update({
          where: { id: tagId },
          data: { version: { increment: 1 } },
        });
      } else if (assignment.deletedAt) {
        await tx.catTagOnCat.update({
          where: { catId_tagId: { catId, tagId } },
          data: { deletedAt: null, version: { increment: 1 } },
        });
        await tx.catTag.update({
          where: { id: tagId },
          data: { version: { increment: 1 } },
        });
      }
      if (actorUserId)
        await tx.auditEvent.create({
          data: {
            catId,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.tagAddedToCat,
            tagId,
          },
        });
      const card = await tx.cat.findFirst({
        where: { id: catId, isTest },
        include: CAT_CARD_INCLUDE,
      });
      if (!card) throw new NotFoundException("Cat not found");
      return toCatCard(card, this.photoUrls);
    });
  }
}
