import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';
import { MutationResultDto, validateArchivationReasonName } from './archivation-reason.types';

@Injectable()
export class CreateArchivationReasonCommand {
  constructor(private readonly prisma: PrismaService) {}

  async execute(nameInput: string, actorUserId: string): Promise<MutationResultDto> {
    const name = validateArchivationReasonName(nameInput);
    const existing = await this.prisma.catArchivationReason.findFirst({ where: { name, deletedAt: null } });
    if (existing) throw new ConflictException('An archivation reason with this name already exists');

    const reason = await runInNewTransaction(this.prisma, async (transaction) => {
      const created = await transaction.catArchivationReason.create({ data: { name } });
      await transaction.catArchivationReasonAuditEvent.create({
        data: { reasonId: created.id, actorUserId, action: 'create', oldValue: null, newValue: created.name },
      });
      return created;
    });
    return { id: reason.id };
  }
}
