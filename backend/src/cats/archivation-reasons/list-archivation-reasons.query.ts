import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ArchivationReasonDto } from './archivation-reason.types';

@Injectable()
export class ListArchivationReasonsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<ArchivationReasonDto[]> {
    const reasons = await this.prisma.catArchivationReason.findMany({
      where: { deletedAt: null },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
    return reasons.map((reason) => ({ id: reason.id, name: reason.name }));
  }
}
