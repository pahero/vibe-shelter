import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type AuditActor = {
  id: string;
  email: string;
  fullName: string | null;
};

export type AuditRecordInput = {
  actor?: AuditActor | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
};

export type AuditFilters = {
  user?: string;
  from?: string;
  to?: string;
  skip?: number;
  limit?: number;
};

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async record(input: AuditRecordInput): Promise<void> {
    const changes = this.buildChanges(input.oldValues ?? null, input.newValues ?? null);
    await (this.prisma as any).auditLog.create({
      data: {
        actorUserId: input.actor?.id ?? null,
        actorEmail: input.actor?.email ?? null,
        actorName: input.actor?.fullName ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityName: input.entityName ?? null,
        oldValues: input.oldValues ?? null,
        newValues: input.newValues ?? null,
        changes,
      },
    });
  }

  async list(filters: AuditFilters = {}) {
    const { skip, limit } = this.validatePagination(filters.skip, filters.limit);
    const where: any = {};
    const user = filters.user?.trim();
    if (user) {
      where.OR = [
        { actorEmail: { contains: user } },
        { actorName: { contains: user } },
      ];
    }

    const createdAt: any = {};
    if (filters.from) createdAt.gte = this.parseDate(filters.from, 'from');
    if (filters.to) createdAt.lte = this.parseDate(filters.to, 'to', true);
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

    const [data, total] = await Promise.all([
      (this.prisma as any).auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      (this.prisma as any).auditLog.count({ where }),
    ]);

    return {
      data: data.map((item: any) => ({ ...item, createdAt: item.createdAt.toISOString() })),
      total,
      skip,
      limit,
    };
  }

  private buildChanges(oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null) {
    const keys = new Set([...Object.keys(oldValues ?? {}), ...Object.keys(newValues ?? {})]);
    return Array.from(keys)
      .filter((field) => JSON.stringify(oldValues?.[field] ?? null) !== JSON.stringify(newValues?.[field] ?? null))
      .map((field) => ({ field, from: oldValues?.[field] ?? null, to: newValues?.[field] ?? null }));
  }

  private validatePagination(skipInput = 0, limitInput = 50): { skip: number; limit: number } {
    const skip = Number(skipInput);
    const limit = Number(limitInput);
    if (!Number.isInteger(skip) || skip < 0) throw new BadRequestException('skip must be a non-negative integer');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('limit must be an integer between 1 and 100');
    return { skip, limit };
  }

  private parseDate(value: string, field: string, endOfDay = false): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`${field} must be a valid date`);
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
    return date;
  }
}
