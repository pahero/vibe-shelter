import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';
import { UpdateCatTagCommand } from '../dto/create-cat-tag.dto';
import { CatTag } from '../cats.types';
import { toCatTag } from '../cats.mappers';
import { validateTagColor, validateTagName } from '../cats.handler-utils';
import { validateCatId } from '../cats.handler-utils';

@Injectable()
export class UpdateCatTagHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(id: string, data: UpdateCatTagCommand, actorUserId?: string): Promise<CatTag> {
    validateCatId(id, 'Tag ID');
    if (data.name === undefined && data.color === undefined) throw new BadRequestException('Tag name or color is required');
    const name = data.name === undefined ? undefined : validateTagName(data.name);
    const color = data.color === undefined ? undefined : validateTagColor(data.color);
    return runInNewTransaction(this.prisma, async (tx) => {
      const existing = await tx.catTag.findFirst({ where: { id, deletedAt: null } });
      if (!existing) throw new NotFoundException('Tag not found');
      if (name && name !== existing.name) {
        const duplicate = await tx.catTag.findFirst({ where: { name, deletedAt: null, id: { not: id } }, select: { id: true } });
        if (duplicate) throw new ConflictException('A tag with this name already exists');
      }
      const updated = await tx.catTag.update({
        where: { id },
        data: { ...(name !== undefined ? { name } : {}), ...(color !== undefined ? { color } : {}), version: { increment: 1 } },
      });
      if (actorUserId) {
        const events = [
          ...(updated.name !== existing.name ? [{ action: 'name_changed', oldValue: existing.name, newValue: updated.name }] : []),
          ...(updated.color !== existing.color ? [{ action: 'color_changed', oldValue: existing.color, newValue: updated.color }] : []),
        ];
        if (events.length) await tx.tagAuditEvent.createMany({ data: events.map((event) => ({ tagId: id, actorUserId, ...event })) });
      }
      return toCatTag(updated);
    });
  }
}
