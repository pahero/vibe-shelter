import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { CatHistoryEventDto, CatHistoryResponseDto } from '../dto/cat-history.dto';

type ListCatHistoryInput = {
  catId: string;
  skip?: number;
  limit?: number;
  currentUserIsTest?: boolean;
};

@Injectable()
export class ListCatHistoryQuery {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async execute(input: ListCatHistoryInput): Promise<CatHistoryResponseDto> {
    this.validateId(input.catId);
    const { skip, limit } = this.validatePagination(input.skip, input.limit);

    const cat = await (this.prisma as any).cat.findFirst({
      where: { id: input.catId, isTest: input.currentUserIsTest ?? false },
      select: { id: true },
    });
    if (!cat) {
      throw new NotFoundException('Cat not found');
    }

    const where = { catId: input.catId };
    const [events, total] = await Promise.all([
      (this.prisma as any).catAuditEvent.findMany({
        where,
        include: {
          actorUser: { select: { id: true, fullName: true, email: true } },
          photo: { select: { id: true, key: true, deletedAt: true } },
        },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
      (this.prisma as any).catAuditEvent.count({ where }),
    ]);

    return {
      data: await Promise.all(events.map((event: any) => this.toDto(event))),
      total,
      skip,
      limit,
    };
  }

  private async toDto(event: any): Promise<CatHistoryEventDto> {
    return {
      id: event.id,
      catId: event.catId,
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

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException('Cat ID is required');
    }
  }
}
