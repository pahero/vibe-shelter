import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';
import { CAT_AUDIT_EVENT_TYPES } from '../cat-audit-event-types';
import { CreateCatWeightCommand } from '../dto/create-cat-weight.dto';
import { toCatWeight } from '../cats.mappers';
import { validateCatId, validateWeightCommand } from '../cats.handler-utils';

@Injectable()
export class AddCatWeightHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(catId: string, data: CreateCatWeightCommand, actorUserId: string | undefined, isTest: boolean) {
    validateCatId(catId);
    const measuredAt = validateWeightCommand(data);
    if (!Number.isFinite(data.weightKg) || data.weightKg <= 0) throw new BadRequestException('weightKg must be a positive number');
    return runInNewTransaction(this.prisma, async (tx) => {
      const cat = await tx.cat.findFirst({ where: { id: catId, isTest }, select: { id: true } });
      if (!cat) throw new NotFoundException('Cat not found');
      const weight = await tx.catWeight.create({ data: { catId, weightKg: data.weightKg, measuredAt } });
      if (actorUserId) await tx.catAuditEvent.create({ data: { catId, actorUserId, eventType: CAT_AUDIT_EVENT_TYPES.weightCreated } });
      return toCatWeight(weight);
    });
  }
}
