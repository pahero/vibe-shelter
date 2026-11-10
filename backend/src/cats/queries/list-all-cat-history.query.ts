import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import {
  ArchivingReasonEventDto,
  CatEventDto,
  CatFileEventDto,
  CatHistoryResponseDto,
  CatMedicalNoteEventDto,
  CatParasiteTreatmentEventDto,
  CatTagEventDto,
  CatTaskEventDto,
  CatTreatmentEventDto,
  CatWeightEventDto,
  CatVaccinationEventDto,
  FlightAuditEventDto,
  FlightCatAuditEventDto,
  FlightPhotoAuditEventDto,
  LocationAuditEventDto,
  TagAuditEventDto,
} from "../dto/cat-history.dto";

type ListAllCatHistoryInput = {
  userId?: string;
  catId?: string;
  flightId?: string;
  from?: string;
  to?: string;
  skip?: number;
  limit?: number;
  currentUserIsTest?: boolean;
};

const auditEventInclude = {
  actorUser: { select: { id: true, fullName: true } },
  photo: {
    select: { id: true, key: true },
  },
  document: { select: { id: true, key: true } },
  treatment: { select: { id: true, shortName: true, deletedAt: true } },
  tag: { select: { id: true, name: true, deletedAt: true } },
  weight: { select: { id: true, measuredAt: true } },
  task: { select: { id: true, comment: true, dueDate: true, deletedAt: true } },
  medicalNote: { select: { id: true, date: true } },
  vaccination: {
    select: { id: true, date: true, vaccineName: true },
  },
  parasiteTreatment: {
    select: { id: true, date: true, productName: true },
  },
  location: { select: { id: true, name: true } },
  flight: {
    select: { id: true, flightNumber: true, airport: true, date: true },
  },
  flightPhoto: { select: { id: true, key: true } },
  archivingReason: { select: { id: true, name: true } },
  cat: { select: { id: true, name: true, nameNumber: true } },
} satisfies Prisma.AuditEventInclude;

type AuditEvent = Prisma.AuditEventGetPayload<{
  include: typeof auditEventInclude;
}>;

@Injectable()
export class ListAllCatHistoryQuery {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async execute(input: ListAllCatHistoryInput): Promise<CatHistoryResponseDto> {
    const { skip, limit } = this.validatePagination(input.skip, input.limit);
    const eventScope: Prisma.AuditEventWhereInput = {
      isTest: input.currentUserIsTest ?? false,
    };

    const userId = input.userId?.trim();
    if (userId) {
      eventScope.actorUserId = userId;
    }

    if (input.from || input.to) {
      eventScope.occurredAt = {};
      if (input.from)
        eventScope.occurredAt.gte = this.parseDate(input.from, "from");
      if (input.to)
        eventScope.occurredAt.lte = this.parseDate(input.to, "to", true);
    }

    if (input.catId?.trim()) {
      eventScope.catId = input.catId.trim();
    }

    if (input.flightId?.trim()) {
      eventScope.flightId = input.flightId.trim();
    }

    const total = await this.prisma.auditEvent.count({
      where: eventScope,
    });
    const auditEvents = await this.prisma.auditEvent.findMany({
      where: eventScope,
      skip,
      take: limit,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      include: auditEventInclude,
    });

    const events: (
      | CatEventDto
      | CatFileEventDto
      | CatWeightEventDto
      | CatTagEventDto
      | CatTaskEventDto
      | CatTreatmentEventDto
      | CatMedicalNoteEventDto
      | CatVaccinationEventDto
      | CatParasiteTreatmentEventDto
      | ArchivingReasonEventDto
      | TagAuditEventDto
      | LocationAuditEventDto
      | FlightAuditEventDto
      | FlightCatAuditEventDto
      | FlightPhotoAuditEventDto
    )[] = await Promise.all(
      auditEvents.map(async (event) => {
        const eventType = this.resolveEventType(event);
        switch (eventType) {
          case "cat_created":
          case "cat_archived":
          case "cat_dearchived":
          case "name_changed":
          case "name_number_changed":
          case "sex_changed":
          case "color_changed":
          case "estimated_birth_date_changed":
          case "intake_date_changed":
          case "intake_details_changed":
          case "intake_source_changed":
          case "microchip_number_changed":
          case "passport_changed":
          case "sponsor_name_changed":
          case "adopter_name_changed":
          case "adopter_address_changed":
          case "adopter_country_changed":
          case "felv_fiv_test_done_changed":
          case "flight_candidate_changed":
          case "sterilization_status_changed":
          case "current_location_changed":
            return this.toCatEventDto(event);
          case "weight_created":
          case "weight_deleted":
            return this.toCatWeightEventDto(event);
          case "tag_added_to_cat":
          case "tag_removed_from_cat":
            return this.toCatTagEventDto(event);
          case "tag_create":
          case "tag_restore":
          case "tag_name_changed":
          case "tag_color_changed":
          case "tag_delete":
            return this.toTagAuditEventDto(event, eventType);
          case "task_created":
          case "task_comment_changed":
          case "task_due_date_changed":
          case "task_receivers_changed":
          case "task_deleted":
          case "task_completed":
          case "task_reopened":
            return this.toCatTaskEventDto(event);
          case "treatment_created":
          case "treatment_deleted":
          case "treatment_restored":
          case "treatment_short_name_changed":
          case "treatment_start_date_changed":
          case "treatment_end_date_changed":
          case "treatment_doses_per_day_changed":
          case "treatment_instructions_changed":
          case "treatment_administration_checked":
          case "treatment_administration_unchecked":
            return this.toCatTreatmentEventDto(event);
          case "medical_note_created":
          case "medical_note_deleted":
          case "medical_note_restored":
          case "medical_note_date_changed":
          case "medical_note_comment_changed":
            return this.toCatMedicalNoteEventDto(event);
          case "vaccination_created":
          case "vaccination_deleted":
          case "vaccination_type_changed":
          case "vaccination_date_changed":
          case "vaccination_next_due_date_changed":
          case "vaccine_name_changed":
            return this.toCatVaccinationEventDto(event);
          case "parasite_treatment_created":
          case "parasite_treatment_deleted":
          case "parasite_treatment_type_changed":
          case "parasite_treatment_date_changed":
          case "parasite_treatment_next_due_date_changed":
          case "product_name_changed":
            return this.toCatParasiteTreatmentEventDto(event);
          case "photo_created":
          case "photo_deleted":
          case "primary_photo_changed":
          case "document_created":
          case "document_deleted":
            return this.toCatFileEventDto(event);
          case "archiving_reason_create":
          case "archiving_reason_update":
          case "archiving_reason_delete":
            return this.toArchivingReasonEventDto(event);
          case "location_create":
          case "location_name_changed":
          case "location_description_changed":
          case "location_owner_changed":
          case "location_status_changed":
          case "location_delete":
            return this.toLocationAuditEventDto(event, eventType);
          case "flight_created":
          case "flight_date_changed":
          case "flight_airport_changed":
          case "flight_number_changed":
          case "flight_parent_changed":
          case "flight_comment_changed":
          case "flight_deleted":
          case "flight_restored":
            return this.toFlightAuditEventDto(event, eventType);
          case "flight_photo_created":
          case "flight_photo_deleted":
            return this.toFlightPhotoAuditEventDto(event, eventType);
          case "flight_cat_assigned":
          case "flight_cat_unassigned":
          case "flight_cat_restored":
          case "flight_cat_f2f_changed":
          case "flight_cat_traces_changed":
            return this.toFlightCatAuditEventDto(event, eventType);
          default:
            throw new Error(`Unhandled event type: ${eventType}`);
        }
      }),
    );

    return {
      data: events,
      total,
      skip,
      limit,
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

  private resolveEventType(event: AuditEvent): string {
    if (event.tagId && event.action) return `tag_${event.action}`;
    if (event.locationId && event.action) return `location_${event.action}`;
    return event.eventType;
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

  private toCatEventDto(event: AuditEvent): CatEventDto {
    if (!event.catId || !event.cat)
      throw new Error("Cat event must have a catId and cat object");

    return {
      id: event.id,
      catId: event.catId,
      catName: event.cat.name,
      catNameNumber: event.cat.nameNumber,
      occurredAt: event.occurredAt.toISOString(),
      eventType: event.eventType,
      oldValue: event.oldValue,
      newValue: event.newValue,
      actorId: event.actorUser.id,
      actorFullName: event.actorUser.fullName ?? "Unnamed user",
    };
  }

  private async toCatFileEventDto(event: AuditEvent): Promise<CatFileEventDto> {
    const catEvent = this.toCatEventDto(event);
    if (!event.photo && !event.document)
      throw new Error("Cat file event must have either a photo or document");
    if (event.photo)
      return {
        ...catEvent,
        fileId: event.photo.id,
        fileUrl: await this.photoUrls.getPhotoUrl(event.photo.key),
      };
    return {
      ...catEvent,
      fileId: event.document!.id,
      fileUrl: await this.photoUrls.getDocumentUrl(event.document!.key),
    };
  }

  private toCatWeightEventDto(event: AuditEvent): CatWeightEventDto {
    if (!event.weight)
      throw new Error("Cat weight event must have a weight object");

    return {
      ...this.toCatEventDto(event),
      weightId: event.weight.id,
      measuredAt: event.weight.measuredAt.toISOString(),
    };
  }

  private toCatTagEventDto(event: AuditEvent): CatTagEventDto {
    if (!event.tag) throw new Error("Cat tag event must have a tag object");

    return {
      ...this.toCatEventDto(event),
      tagId: event.tag.id,
      tagName: event.tag.name,
    };
  }

  private toCatTaskEventDto(event: AuditEvent): CatTaskEventDto {
    if (!event.task) throw new Error("Cat task event must have a task object");

    return {
      ...this.toCatEventDto(event),
      taskId: event.task.id,
      taskComment: event.task.comment,
      taskDueDate: event.task.dueDate.toISOString(),
    };
  }

  private toCatTreatmentEventDto(event: AuditEvent): CatTreatmentEventDto {
    if (!event.treatment)
      throw new Error("Cat treatment event must have a treatment object");

    return {
      ...this.toCatEventDto(event),
      treatmentId: event.treatment.id,
      treatmentShortName: event.treatment.shortName,
    };
  }

  private toCatMedicalNoteEventDto(event: AuditEvent): CatMedicalNoteEventDto {
    if (!event.medicalNote)
      throw new Error("Cat medical note event must have a medical note object");

    return {
      ...this.toCatEventDto(event),
      medicalNoteId: event.medicalNote.id,
      medicalNoteDate: event.medicalNote.date.toISOString(),
    };
  }

  private toCatVaccinationEventDto(event: AuditEvent): CatVaccinationEventDto {
    if (!event.vaccination)
      throw new Error("Cat vaccination event must have a vaccination object");

    return {
      ...this.toCatEventDto(event),
      vaccinationId: event.vaccination.id,
      vaccinationDate: event.vaccination.date.toISOString(),
      vaccineName: event.vaccination.vaccineName,
    };
  }

  private toCatParasiteTreatmentEventDto(
    event: AuditEvent,
  ): CatParasiteTreatmentEventDto {
    if (!event.parasiteTreatment)
      throw new Error(
        "Cat parasite treatment event must have a parasite treatment object",
      );

    return {
      ...this.toCatEventDto(event),
      parasiteTreatmentId: event.parasiteTreatment.id,
      parasiteTreatmentDate: event.parasiteTreatment.date.toISOString(),
      productName: event.parasiteTreatment.productName,
    };
  }

  private toTagAuditEventDto(
    event: AuditEvent,
    eventType: string,
  ): TagAuditEventDto {
    if (!event.tag) throw new Error("Tag audit event must have a tag object");
    return {
      id: event.id,
      tagId: event.tag.id,
      tagName: event.tag.name,
      occurredAt: event.occurredAt.toISOString(),
      eventType,
      oldValue: event.oldValue,
      newValue: event.newValue,
      actorId: event.actorUser.id,
      actorFullName: event.actorUser.fullName ?? "Unnamed user",
    };
  }

  private toLocationAuditEventDto(
    event: AuditEvent,
    eventType: string,
  ): LocationAuditEventDto {
    if (!event.location)
      throw new Error("Location audit event must have a location object");
    return {
      id: event.id,
      locationId: event.location.id,
      locationName: event.location.name,
      occurredAt: event.occurredAt.toISOString(),
      eventType,
      oldValue: event.oldValue,
      newValue: event.newValue,
      actorId: event.actorUser.id,
      actorFullName: event.actorUser.fullName ?? "Unnamed user",
    };
  }

  private async toFlightAuditEventDto(
    event: AuditEvent,
    eventType: string,
  ): Promise<FlightAuditEventDto> {
    if (!event.flight)
      throw new Error("Flight audit event must have a flight object");
    return {
      id: event.id,
      flightId: event.flight.id,
      flightNumber: event.flight.flightNumber,
      airport: event.flight.airport,
      flightDate: event.flight.date.toISOString().slice(0, 10),
      occurredAt: event.occurredAt.toISOString(),
      eventType,
      oldValue: event.oldValue,
      newValue: event.newValue,
      actorId: event.actorUser.id,
      actorFullName: event.actorUser.fullName ?? "Unnamed user",
    };
  }

  private async toFlightCatAuditEventDto(
    event: AuditEvent,
    eventType: string,
  ): Promise<FlightCatAuditEventDto> {
    if (!event.cat)
      throw new Error("Flight cat audit event must have a cat object");
    return {
      ...(await this.toFlightAuditEventDto(event, eventType)),
      catId: event.cat.id,
      catName: event.cat.name,
      catNameNumber: event.cat.nameNumber,
    };
  }

  private async toFlightPhotoAuditEventDto(
    event: AuditEvent,
    eventType: string,
  ): Promise<FlightPhotoAuditEventDto> {
    if (!event.flightPhoto)
      throw new Error("Flight photo audit event must have a photo object");
    return {
      ...(await this.toFlightAuditEventDto(event, eventType)),
      flightPhotoId: event.flightPhoto.id,
      flightPhotoUrl: await this.photoUrls.getPhotoUrl(event.flightPhoto.key),
    };
  }

  private toArchivingReasonEventDto(
    event: AuditEvent,
  ): ArchivingReasonEventDto {
    if (!event.archivingReason)
      throw new Error(
        "Archiving reason event must have an archivingReason object",
      );

    return {
      id: event.id,
      archivingReasonId: event.archivingReason.id,
      archivingReasonName: event.archivingReason.name,
      occurredAt: event.occurredAt.toISOString(),
      eventType: event.eventType,
      oldValue: event.oldValue,
      newValue: event.newValue,
      actorId: event.actorUser.id,
      actorFullName: event.actorUser.fullName ?? "Unnamed user",
    };
  }
}
