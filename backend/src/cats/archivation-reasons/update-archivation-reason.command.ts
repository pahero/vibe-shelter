import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';
import { MutationResultDto, validateArchivationReasonName } from './archivation-reason.types';

@Injectable()
export class UpdateArchivationReasonCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string, nameInput: string, actorUserId: string): Promise<MutationResultDto> {
    const name = validateArchivationReasonName(nameInput);
    const existing = await this.prisma.catArchivationReason.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException('Archivation reason not found');
    const duplicate = await this.prisma.catArchivationReason.findFirst({
      where: { name, deletedAt: null, id: { not: id } },
    });
    if (duplicate) throw new ConflictException('An archivation reason with this name already exists');

    const reason = await runInNewTransaction(this.prisma, async (transaction) => {
      const updated = await transaction.catArchivationReason.update({ where: { id }, data: { name } });
      await transaction.catArchivationReasonAuditEvent.create({
        data: { reasonId: id, actorUserId, action: 'update', oldValue: existing.name, newValue: updated.name },
      });
      return updated;
    });
    return { id: reason.id };
  }
}
