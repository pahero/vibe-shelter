import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';
import { CAT_AUDIT_EVENT_TYPES } from '../cat-audit-event-types';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { CatCard, PrimaryPhotoUpload } from '../cats.types';
import { toCatCard } from '../cats.mappers';
import { CAT_CARD_INCLUDE } from '../cats.types';
import { CatPhotoCompressionService } from '../cat-photo-compression.service';

@Injectable()
export class UpdatePrimaryCatPhotoHandler {
  constructor(private readonly prisma: PrismaService, private readonly photoUrls: CatPhotoUrlService) {}

  async handle(catId: string, photo: PrimaryPhotoUpload | undefined, actorUserId: string | undefined, isTest: boolean): Promise<CatCard> {
    if (!catId?.trim()) throw new BadRequestException('Cat ID is required');
    const cat = await this.prisma.cat.findFirst({ where: { id: catId, isTest }, select: { id: true } });
    if (!cat) throw new NotFoundException('Cat not found');
    if (!photo?.buffer?.length) throw new BadRequestException('Primary photo file is required');
    const compressed = await CatPhotoCompressionService.compress(photo);
    const { key, previewKey } = await this.photoUrls.uploadPhotoVariants({
      catId,
      originalName: compressed.full.originalname,
      contentType: compressed.full.mimetype,
      fullBody: compressed.full.buffer,
      previewBody: compressed.preview.buffer,
    });
    const updated = await runInNewTransaction(this.prisma, async (tx) => {
      const created = await tx.catPhoto.create({ data: { catId, key, previewKey, createdByUserId: actorUserId ?? null } });
      const record = await tx.cat.update({ where: { id: catId }, data: { primaryPhotoKey: key }, include: CAT_CARD_INCLUDE });
      if (actorUserId) await tx.catAuditEvent.create({ data: { catId, actorUserId, eventType: CAT_AUDIT_EVENT_TYPES.photoCreated, photoId: created.id } });
      return record;
    });
    return toCatCard(updated, this.photoUrls);
  }
}
