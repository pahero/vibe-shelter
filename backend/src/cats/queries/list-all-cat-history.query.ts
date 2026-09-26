import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { CatHistoryEventDto, CatHistoryResponseDto } from '../dto/cat-history.dto';

type ListAllCatHistoryInput = {
  user?: string;
  catId?: string;
  from?: string;
  to?: string;
  skip?: number;
  limit?: number;
  currentUserIsTest?: boolean;
};

@Injectable()
export class ListAllCatHistoryQuery {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async execute(input: ListAllCatHistoryInput): Promise<CatHistoryResponseDto> {
    const { skip, limit } = this.validatePagination(input.skip, input.limit);
    const where: any = {
      cat: { isTest: input.currentUserIsTest ?? false },
    };

    const user = input.user?.trim();
    if (user) {
      where.actorUser = {
        OR: [
          { fullName: { contains: user, mode: 'insensitive' } },
          { email: { contains: user, mode: 'insensitive' } },
        ],
      };
    }

    if (input.catId?.trim()) {
      where.catId = input.catId;
    }

    const occurredAt: any = {};
    if (input.from) occurredAt.gte = this.parseDate(input.from, 'from');
    if (input.to) occurredAt.lte = this.parseDate(input.to, 'to', true);
    if (Object.keys(occurredAt).length > 0) where.occurredAt = occurredAt;

    const tagWhere: any = {
      actorUser: { isTest: input.currentUserIsTest ?? false },
    };

    if (user) {
      tagWhere.actorUser = {
        AND: [
          { isTest: input.currentUserIsTest ?? false },
          {
            OR: [
              { fullName: { contains: user, mode: 'insensitive' } },
              { email: { contains: user, mode: 'insensitive' } },
            ],
          },
        ],
      };
    }

    const tagCreatedAt: any = {};
    if (input.from) tagCreatedAt.gte = this.parseDate(input.from, 'from');
    if (input.to) tagCreatedAt.lte = this.parseDate(input.to, 'to', true);
    if (Object.keys(tagCreatedAt).length > 0) tagWhere.createdAt = tagCreatedAt;

    const reasonWhere: any = { ...tagWhere, archivationReasonId: { not: null } };
    if (reasonWhere.createdAt) {
      reasonWhere.occurredAt = reasonWhere.createdAt;
      delete reasonWhere.createdAt;
    }

    const [catEvents, tagEvents, locationEvents, archivationReasonEvents] = await Promise.all([
      (this.prisma as any).catAuditEvent.findMany({
        where,
        include: {
          actorUser: { select: { id: true, fullName: true, email: true } },
          photo: { select: { id: true, key: true, deletedAt: true } },
          document: { select: { id: true, key: true, fileName: true, deletedAt: true } },
          cat: { select: { name: true } },
        },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      }),
      input.catId?.trim()
        ? []
        : (this.prisma as any).tagAuditEvent.findMany({
            where: tagWhere,
            include: {
              actorUser: { select: { id: true, fullName: true, email: true } },
            },
          }),
      input.catId?.trim()
        ? []
        : (this.prisma as any).locationAuditEvent.findMany({
            where: tagWhere,
            include: {
              actorUser: { select: { id: true, fullName: true, email: true } },
            },
          }),
      input.catId?.trim()
        ? []
        : this.prisma.catAuditEvent.findMany({
            where: reasonWhere,
            include: {
              actorUser: { select: { id: true, fullName: true, email: true } },
            },
          }),
    ]);

    const events = [
      ...catEvents.map((event: any) => ({ source: 'cat' as const, event, occurredAt: event.occurredAt })),
      ...tagEvents.map((event: any) => ({ source: 'tag' as const, event, occurredAt: event.createdAt })),
      ...locationEvents.map((event: any) => ({ source: 'location' as const, event, occurredAt: event.createdAt })),
      ...archivationReasonEvents.map((event: any) => ({ source: 'archivationReason' as const, event, occurredAt: event.occurredAt })),
    ].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime() || right.event.id.localeCompare(left.event.id));

    return {
      data: await Promise.all(events.slice(skip, skip + limit).map(({ source, event }) => {
        if (source === 'cat') return this.toDto(event);
        if (source === 'tag') return this.toTagDto(event);
        if (source === 'location') return this.toLocationDto(event);
        return this.toArchivationReasonDto(event);
      })),
      total: events.length,
      skip,
      limit,
    };
  }

  private async toDto(event: any): Promise<CatHistoryEventDto> {
    return {
      id: event.id,
      catId: event.catId,
      catName: event.cat?.name ?? null,
      eventType: event.eventType,
      occurredAt: event.occurredAt.toISOString(),
      actor: {
        id: event.actorUser.id,
        displayName: event.actorUser.fullName || event.actorUser.email,
        email: event.actorUser.email,
      },
      oldValue: event.oldValue,
      newValue: event.newValue,
      photo: event.photo
        ? {
            id: event.photo.id,
            link: await this.photoUrls.getPhotoUrl(event.photo.key),
            status: event.photo.deletedAt ? 'DELETED' : 'ACTIVE',
          }
        : null,
      document: event.document
        ? {
            id: event.document.id,
            link: await this.photoUrls.getDocumentUrl(event.document.key),
            fileName: event.document.fileName,
            status: event.document.deletedAt ? 'DELETED' : 'ACTIVE',
          }
        : null,
    };
  }

  private toTagDto(event: any): CatHistoryEventDto {
    return {
      id: `tag-${event.id}`,
      catId: null,
      catName: null,
      eventType: `tag_${event.action}`,
      occurredAt: event.createdAt.toISOString(),
      actor: {
        id: event.actorUser.id,
        displayName: event.actorUser.fullName || event.actorUser.email,
        email: event.actorUser.email,
      },
      oldValue: event.oldValue,
      newValue: event.newValue,
      photo: null,
      document: null,
    };
  }

  private toLocationDto(event: any): CatHistoryEventDto {
    return {
      id: `location-${event.id}`,
      catId: null,
      catName: null,
      eventType: `location_${event.action}`,
      occurredAt: event.createdAt.toISOString(),
      actor: {
        id: event.actorUser.id,
        displayName: event.actorUser.fullName || event.actorUser.email,
        email: event.actorUser.email,
      },
      oldValue: event.oldValue,
      newValue: event.newValue,
      photo: null,
      document: null,
    };
  }

  private toArchivationReasonDto(event: any): CatHistoryEventDto {
    return {
      id: `archivation-reason-${event.id}`,
      catId: null,
      catName: null,
      eventType: event.eventType,
      occurredAt: event.occurredAt.toISOString(),
      actor: {
        id: event.actorUser.id,
        displayName: event.actorUser.fullName || event.actorUser.email,
        email: event.actorUser.email,
      },
      oldValue: event.oldValue,
      newValue: event.newValue,
      photo: null,
      document: null,
    };
  }

  private validatePagination(skipInput = 0, limitInput = 50): { skip: number; limit: number } {
    const skip = Number(skipInput);
    const limit = Number(limitInput);
    if (!Number.isInteger(skip) || skip < 0) {
      throw new BadRequestException('skip must be a non-negative integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be an integer between 1 and 100');
    }
    return { skip, limit };
  }

  private parseDate(value: string, field: string, endOfDay = false): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCHours(23, 59, 59, 999);
    return date;
  }
}
