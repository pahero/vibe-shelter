import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import {
  CatHistoryEventDto,
  CatHistoryResponseDto,
} from "../dto/cat-history.dto";

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
      isTest: input.currentUserIsTest ?? false,
      cat: { isTest: input.currentUserIsTest ?? false },
    };

    const user = input.user?.trim();
    if (user) {
      where.actorUser = {
        OR: [
          { fullName: { contains: user, mode: "insensitive" } },
          { email: { contains: user, mode: "insensitive" } },
        ],
      };
    }

    if (input.catId?.trim()) {
      where.catId = input.catId;
    }

    const occurredAt: any = {};
    if (input.from) occurredAt.gte = this.parseDate(input.from, "from");
    if (input.to) occurredAt.lte = this.parseDate(input.to, "to", true);
    if (Object.keys(occurredAt).length > 0) where.occurredAt = occurredAt;

    const tagWhere: any = {
      isTest: input.currentUserIsTest ?? false,
      actorUser: { isTest: input.currentUserIsTest ?? false },
    };

    if (user) {
      tagWhere.actorUser = {
        AND: [
          { isTest: input.currentUserIsTest ?? false },
          {
            OR: [
              { fullName: { contains: user, mode: "insensitive" } },
              { email: { contains: user, mode: "insensitive" } },
            ],
          },
        ],
      };
    }

    const tagCreatedAt: any = {};
    if (input.from) tagCreatedAt.gte = this.parseDate(input.from, "from");
    if (input.to) tagCreatedAt.lte = this.parseDate(input.to, "to", true);
    if (Object.keys(tagCreatedAt).length > 0) tagWhere.createdAt = tagCreatedAt;

    const reasonWhere: any = {
      ...tagWhere,
      archivingReasonId: { not: null },
    };
    if (reasonWhere.createdAt) {
      reasonWhere.occurredAt = reasonWhere.createdAt;
      delete reasonWhere.createdAt;
    }

    const flightWhere: any = {
      isTest: input.currentUserIsTest ?? false,
      flight: { isTest: input.currentUserIsTest ?? false },
    };
    if (input.catId?.trim()) flightWhere.catId = input.catId;
    if (user) {
      flightWhere.actorUser = {
        OR: [
          { fullName: { contains: user, mode: "insensitive" } },
          { email: { contains: user, mode: "insensitive" } },
        ],
      };
    }
    if (Object.keys(occurredAt).length > 0) flightWhere.createdAt = occurredAt;

    const [
      catEvents,
      tagEvents,
      locationEvents,
      archivingReasonEvents,
      flightEvents,
    ] = await Promise.all([
      (this.prisma as any).auditEvent.findMany({
        where,
        include: {
          actorUser: { select: { id: true, fullName: true, email: true } },
          photo: { select: { id: true, key: true, deletedAt: true, createdAt: true } },
          document: {
            select: { id: true, key: true, fileName: true, deletedAt: true },
          },
          treatment: { select: { id: true, shortName: true, deletedAt: true } },
          tag: { select: { id: true, name: true, deletedAt: true } },
          weight: { select: { id: true, measuredAt: true, weightKg: true, deletedAt: true } },
          task: { select: { id: true, comment: true, dueDate: true, deletedAt: true } },
          medicalNote: { select: { id: true, date: true, comment: true, deletedAt: true } },
          preventiveTreatment: { select: { id: true, date: true, name: true, type: true, deletedAt: true } },
          note: { select: { id: true, date: true, comment: true, deletedAt: true } },
          archivingReason: { select: { id: true, name: true, deletedAt: true } },
          location: { select: { id: true, name: true, deletedAt: true } },
          cat: { select: { name: true } },
        },
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      }),
      input.catId?.trim()
        ? []
        : (this.prisma as any).auditEvent.findMany({
            where: tagWhere,
            include: {
              actorUser: { select: { id: true, fullName: true, email: true } },
              tag: { select: { id: true, name: true, deletedAt: true } },
            },
          }),
      input.catId?.trim()
        ? []
        : (this.prisma as any).auditEvent.findMany({
            where: tagWhere,
            include: {
              actorUser: { select: { id: true, fullName: true, email: true } },
              location: { select: { id: true, name: true, deletedAt: true } },
              relatedUser: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  deletedAt: true,
                },
              },
            },
          }),
      input.catId?.trim()
        ? []
        : this.prisma.auditEvent.findMany({
            where: reasonWhere,
            include: {
              actorUser: { select: { id: true, fullName: true, email: true } },
              archivingReason: { select: { id: true, name: true, deletedAt: true } },
            },
          }),
      this.prisma.auditEvent.findMany({
        where: flightWhere,
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
      }),
    ]);

    const events = [
      ...catEvents.map((event: any) => ({
        source: "cat" as const,
        event,
        occurredAt: event.occurredAt,
      })),
      ...tagEvents.map((event: any) => ({
        source: "tag" as const,
        event,
        occurredAt: event.createdAt,
      })),
      ...locationEvents.map((event: any) => ({
        source: "location" as const,
        event,
        occurredAt: event.createdAt,
      })),
      ...archivingReasonEvents.map((event: any) => ({
        source: "archivingReason" as const,
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
        events.slice(skip, skip + limit).map(({ source, event }) => {
          if (source === "cat") return this.toDto(event);
          if (source === "tag") return this.toTagDto(event);
          if (source === "location") return this.toLocationDto(event);
          if (source === "flight") return this.toFlightDto(event);
          return this.toArchivingReasonDto(event);
        }),
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
      weight: event.weight
        ? { id: event.weight.id, measuredAt: event.weight.measuredAt.toISOString().slice(0, 10), weightKg: event.weight.weightKg, isDeleted: Boolean(event.weight.deletedAt) }
        : null,
      task: event.task
        ? { id: event.task.id, comment: event.task.comment, dueDate: event.task.dueDate.toISOString(), isDeleted: Boolean(event.task.deletedAt) }
        : null,
      medicalNote: event.medicalNote
        ? { id: event.medicalNote.id, date: event.medicalNote.date.toISOString().slice(0, 10), comment: event.medicalNote.comment, isDeleted: Boolean(event.medicalNote.deletedAt) }
        : null,
      preventiveTreatment: event.preventiveTreatment
        ? { id: event.preventiveTreatment.id, date: event.preventiveTreatment.date.toISOString().slice(0, 10), name: event.preventiveTreatment.name, type: event.preventiveTreatment.type, isDeleted: Boolean(event.preventiveTreatment.deletedAt) }
        : null,
      note: event.note
        ? { id: event.note.id, date: event.note.date.toISOString().slice(0, 10), comment: event.note.comment, isDeleted: Boolean(event.note.deletedAt) }
        : null,
      archivingReason: event.archivingReason
        ? { id: event.archivingReason.id, name: event.archivingReason.name, isDeleted: Boolean(event.archivingReason.deletedAt) }
        : null,
      location: event.location
        ? { id: event.location.id, name: event.location.name, isDeleted: Boolean(event.location.deletedAt) }
        : null,
      relatedUser: null,
      photo: event.photo
        ? {
            id: event.photo.id,
            createdAt: event.photo.createdAt.toISOString().slice(0, 10),
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
      weight: null,
      task: null,
      medicalNote: null,
      preventiveTreatment: null,
      note: null,
      archivingReason: null,
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
      treatmentAdministrationDate: null,
      treatment: null,
      tag: event.tag
        ? {
            id: event.tag.id,
            name: event.tag.name,
            isDeleted: Boolean(event.tag.deletedAt),
          }
        : null,
      weight: null,
      task: null,
      medicalNote: null,
      preventiveTreatment: null,
      note: null,
      archivingReason: null,
      location: null,
      relatedUser: null,
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
      treatmentAdministrationDate: null,
      treatment: null,
      tag: null,
      weight: null,
      task: null,
      medicalNote: null,
      preventiveTreatment: null,
      note: null,
      archivingReason: null,
      location: event.location
        ? {
            id: event.location.id,
            name: event.location.name,
            isDeleted: Boolean(event.location.deletedAt),
          }
        : null,
      relatedUser: event.relatedUser
        ? {
            id: event.relatedUser.id,
            displayName: event.relatedUser.fullName || event.relatedUser.email,
            isDeleted: Boolean(event.relatedUser.deletedAt),
          }
        : null,
      photo: null,
      document: null,
    };
  }

  private toArchivingReasonDto(event: any): CatHistoryEventDto {
    return {
      id: `archiving-reason-${event.id}`,
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
      treatmentAdministrationDate: null,
      treatment: null,
      tag: null,
      weight: null,
      task: null,
      medicalNote: null,
      preventiveTreatment: null,
      note: null,
      archivingReason: event.archivingReason
        ? { id: event.archivingReason.id, name: event.archivingReason.name, isDeleted: Boolean(event.archivingReason.deletedAt) }
        : null,
      location: null,
      relatedUser: null,
      photo: null,
      document: null,
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

  private parseDate(value: string, field: string, endOfDay = false): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value))
      date.setUTCHours(23, 59, 59, 999);
    return date;
  }
}
