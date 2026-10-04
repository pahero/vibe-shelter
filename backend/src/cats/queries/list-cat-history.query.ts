import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import {
  CatHistoryEventDto,
  CatHistoryResponseDto,
} from "../dto/cat-history.dto";

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
      throw new NotFoundException("Cat not found");
    }

    const where = { catId: input.catId };
    const [catEvents, flightEvents] = await Promise.all([
      (this.prisma as any).auditEvent.findMany({
        where,
        include: {
          actorUser: { select: { id: true, fullName: true, email: true } },
          photo: { select: { id: true, key: true, deletedAt: true } },
          document: {
            select: { id: true, key: true, fileName: true, deletedAt: true },
          },
          treatment: { select: { id: true, shortName: true, deletedAt: true } },
          tag: { select: { id: true, name: true, deletedAt: true } },
          cat: { select: { name: true } },
        },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      }),
      this.prisma.auditEvent.findMany({
        where: {
          catId: input.catId,
          flight: { isTest: input.currentUserIsTest ?? false },
        },
        include: {
          actorUser: { select: { id: true, fullName: true, email: true } },
          cat: { select: { id: true, name: true } },
          flight: {
            select: {
              id: true,
              flightNumber: true,
              airport: true,
              date: true,
              deletedAt: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    ]);
    const events = [
      ...catEvents.map((event: any) => ({
        source: "cat" as const,
        event,
        occurredAt: event.occurredAt,
      })),
      ...flightEvents.map((event) => ({
        source: "flight" as const,
        event,
        occurredAt: event.createdAt,
      })),
    ].sort(
      (left, right) =>
        right.occurredAt.getTime() - left.occurredAt.getTime() ||
        right.event.id.localeCompare(left.event.id),
    );

    return {
      data: await Promise.all(
        events
          .slice(skip, skip + limit)
          .map(({ source, event }) =>
            source === "cat" ? this.toDto(event) : this.toFlightDto(event),
          ),
      ),
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
      treatmentAdministrationDate:
        event.treatmentAdministrationDate?.toISOString().slice(0, 10) ?? null,
      treatment: event.treatment
        ? {
            id: event.treatment.id,
            shortName: event.treatment.shortName,
            isDeleted: Boolean(event.treatment.deletedAt),
          }
        : null,
      tag: event.tag
        ? {
            id: event.tag.id,
            name: event.tag.name,
            isDeleted: Boolean(event.tag.deletedAt),
          }
        : null,
      location: null,
      relatedUser: null,
      photo: event.photo
        ? {
            id: event.photo.id,
            link: await this.photoUrls.getPhotoUrl(event.photo.key),
            status: event.photo.deletedAt ? "DELETED" : "ACTIVE",
          }
        : null,
      document: event.document
        ? {
            id: event.document.id,
            link: await this.photoUrls.getDocumentUrl(event.document.key),
            fileName: event.document.fileName,
            status: event.document.deletedAt ? "DELETED" : "ACTIVE",
          }
        : null,
    };
  }

  private toFlightDto(event: {
    id: string;
    catId: string | null;
    cat: { id: string; name: string } | null;
    eventType: string;
    createdAt: Date;
    actorUser: { id: string; fullName: string | null; email: string };
    oldValue: string | null;
    newValue: string | null;
    flight: {
      id: string;
      flightNumber: string;
      airport: string;
      date: Date;
      deletedAt: Date | null;
    };
  }): CatHistoryEventDto {
    return {
      id: `flight-${event.id}`,
      catId: event.catId,
      catName: event.cat?.name ?? null,
      eventType: event.eventType,
      occurredAt: event.createdAt.toISOString(),
      actor: {
        id: event.actorUser.id,
        displayName: event.actorUser.fullName || event.actorUser.email,
        email: event.actorUser.email,
      },
      oldValue: event.oldValue,
      newValue: event.newValue,
      treatmentAdministrationDate: null,
      treatment: null,
      tag: null,
      location: null,
      relatedUser: null,
      photo: null,
      document: null,
      flight: {
        id: event.flight.id,
        flightNumber: event.flight.flightNumber,
        airport: event.flight.airport,
        date: event.flight.date.toISOString().slice(0, 10),
        isDeleted: event.flight.deletedAt !== null,
      },
    };
  }

  private validatePagination(
    skipInput = 0,
    limitInput = 50,
  ): { skip: number; limit: number } {
    const skip = Number(skipInput);
    const limit = Number(limitInput);
    if (!Number.isInteger(skip) || skip < 0) {
      throw new BadRequestException("skip must be a non-negative integer");
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException(
        "limit must be an integer between 1 and 100",
      );
    }
    return { skip, limit };
  }

  private validateId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new BadRequestException("Cat ID is required");
    }
  }
}
