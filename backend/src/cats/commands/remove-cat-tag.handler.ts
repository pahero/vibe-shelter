import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';
import { CAT_AUDIT_EVENT_TYPES } from '../cat-audit-event-types';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { CAT_CARD_INCLUDE } from '../cats.types';
import { toCatCard } from '../cats.mappers';
import { validateCatId } from '../cats.handler-utils';

@Injectable()
export class RemoveCatTagHandler {
  constructor(private readonly prisma: PrismaService, private readonly photoUrls: CatPhotoUrlService) {}

  async handle(catId: string, tagId: string, actorUserId: string | undefined, isTest: boolean) {
    validateCatId(catId);
    validateCatId(tagId, 'Tag ID');
    return runInNewTransaction(this.prisma, async (tx) => {
      const cat = await tx.cat.findFirst({ where: { id: catId, isTest }, select: { id: true } });
      if (!cat) throw new NotFoundException('Cat not found');
      const tag = await tx.catTag.findFirst({ where: { id: tagId, deletedAt: null }, select: { id: true } });
      if (!tag) throw new NotFoundException('Tag not found');
      const removed = await tx.catTagOnCat.deleteMany({ where: { catId, tagId } });
      if (removed.count > 0) await tx.catTag.update({ where: { id: tagId }, data: { version: { increment: 1 } } });
      if (actorUserId) await tx.catAuditEvent.create({ data: { catId, actorUserId, eventType: CAT_AUDIT_EVENT_TYPES.tagRemovedFromCat, tagId } });
      const card = await tx.cat.findFirst({ where: { id: catId, isTest }, include: CAT_CARD_INCLUDE });
      if (!card) throw new NotFoundException('Cat not found');
      return toCatCard(card, this.photoUrls);
    });
  }
}
