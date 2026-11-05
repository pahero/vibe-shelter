import { ConfigService } from "@nestjs/config";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  createBucket,
  deleteBucket,
  getS3Client,
  runInTestTransaction,
} from "../../test-utils/test-db";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { ListAllCatHistoryQuery } from "./list-all-cat-history.query";

const catEventTypes = [
  "cat_created",
  "cat_archived",
  "cat_dearchived",
  "name_changed",
  "name_number_changed",
  "sex_changed",
  "color_changed",
  "estimated_birth_date_changed",
  "intake_date_changed",
  "intake_details_changed",
  "intake_source_changed",
  "microchip_number_changed",
  "passport_changed",
  "sponsor_name_changed",
  "adopter_name_changed",
  "adopter_address_changed",
  "adopter_country_changed",
  "felv_fiv_test_done_changed",
  "flight_candidate_changed",
  "sterilization_status_changed",
  "current_location_changed",
] as const;

const tagActions = [
  "create",
  "restore",
  "name_changed",
  "color_changed",
  "delete",
] as const;

const locationActions = [
  "create",
  "name_changed",
  "description_changed",
  "owner_changed",
  "status_changed",
  "delete",
] as const;

const flightEventTypes = [
  "flight_created",
  "flight_date_changed",
  "flight_airport_changed",
  "flight_number_changed",
  "flight_parent_changed",
  "flight_comment_changed",
  "flight_deleted",
  "flight_restored",
  "flight_photo_created",
  "flight_photo_deleted",
  "flight_cat_assigned",
  "flight_cat_unassigned",
  "flight_cat_restored",
  "flight_cat_f2f_changed",
  "flight_cat_traces_changed",
] as const;

const directRelatedEventTypes = [
  "weight_created",
  "weight_deleted",
  "tag_added_to_cat",
  "tag_removed_from_cat",
  "task_created",
  "task_comment_changed",
  "task_due_date_changed",
  "task_receivers_changed",
  "task_deleted",
  "task_completed",
  "treatment_created",
  "treatment_deleted",
  "treatment_restored",
  "treatment_short_name_changed",
  "treatment_start_date_changed",
  "treatment_end_date_changed",
  "treatment_doses_per_day_changed",
  "treatment_instructions_changed",
  "treatment_administration_checked",
  "treatment_administration_unchecked",
  "medical_note_created",
  "medical_note_deleted",
  "medical_note_restored",
  "medical_note_date_changed",
  "medical_note_comment_changed",
  "vaccination_created",
  "vaccination_deleted",
  "vaccination_type_changed",
  "vaccination_date_changed",
  "vaccination_next_due_date_changed",
  "vaccine_name_changed",
  "parasite_treatment_created",
  "parasite_treatment_deleted",
  "parasite_treatment_type_changed",
  "parasite_treatment_date_changed",
  "parasite_treatment_next_due_date_changed",
  "product_name_changed",
  "photo_created",
  "photo_deleted",
  "primary_photo_changed",
  "document_created",
  "document_deleted",
  "archiving_reason_create",
  "archiving_reason_update",
  "archiving_reason_delete",
] as const;

describe("ListAllCatHistoryQuery", () => {
  let s3Client: ReturnType<typeof getS3Client>;
  let bucketName: string;

  beforeEach(async () => {
    s3Client = getS3Client();
    bucketName = await createBucket("all-cat-history", s3Client);
  });

  afterEach(async () => {
    await deleteBucket(bucketName, s3Client);
    s3Client.destroy();
  });

  it("maps every supported cat, related entity, location, tag, and flight event", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({
        data: {
          email: `history-${crypto.randomUUID()}@example.com`,
          fullName: "History Actor",
        },
      });
      const location = await tx.location.create({
        data: { name: `History Location ${crypto.randomUUID()}` },
      });
      const cat = await tx.cat.create({
        data: {
          name: `History Cat ${crypto.randomUUID()}`,
          currentLocationId: location.id,
        },
      });
      const tag = await tx.catTag.create({
        data: { name: `History Tag ${crypto.randomUUID()}` },
      });
      const weight = await tx.catWeight.create({
        data: {
          catId: cat.id,
          weightKg: 3.4,
          measuredAt: new Date("2026-09-12"),
        },
      });
      const task = await tx.catTask.create({
        data: {
          catId: cat.id,
          comment: "History task",
          dueDate: new Date("2026-09-13T12:00:00.000Z"),
        },
      });
      const treatment = await tx.catTreatment.create({
        data: {
          catId: cat.id,
          shortName: "History treatment",
          startDate: new Date("2026-09-01"),
          dosesPerDay: 1,
        },
      });
      const medicalNote = await tx.catMedicalNote.create({
        data: {
          catId: cat.id,
          date: new Date("2026-09-02"),
          comment: "Medical note",
        },
      });
      const vaccination = await tx.vaccination.create({
        data: {
          catId: cat.id,
          type: "RABIES",
          date: new Date("2026-09-03"),
          vaccineName: "Vaccine",
        },
      });
      const parasiteTreatment = await tx.parasiteTreatment.create({
        data: {
          catId: cat.id,
          type: "DEWORMING",
          date: new Date("2026-09-04"),
          productName: "Product",
        },
      });
      const photo = await tx.catPhoto.create({
        data: { catId: cat.id, key: `cats/${cat.id}/history-photo.jpg` },
      });
      const document = await tx.catDocument.create({
        data: {
          catId: cat.id,
          key: `cats/${cat.id}/history-document.pdf`,
          fileName: "history-document.pdf",
        },
      });
      const archivingReason = await tx.catArchivingReason.create({
        data: { name: `History reason ${crypto.randomUUID()}` },
      });
      const flight = await tx.flight.create({
        data: {
          date: new Date("2026-09-05"),
          airport: "ATH",
          flightNumber: "HIST-1",
          flightParent: "History flight",
        },
      });
      const flightPhoto = await tx.flightPhoto.create({
        data: {
          flightId: flight.id,
          key: `flights/${flight.id}/history-photo.jpg`,
        },
      });
      const assignment = await tx.flightCatAssignment.create({
        data: { flightId: flight.id, catId: cat.id },
      });

      const rows: Prisma.AuditEventCreateManyInput[] = [
        ...catEventTypes.map((eventType) => ({
          eventType,
          catId: cat.id,
          actorUserId: actor.id,
          isTest: true,
        })),
        ...directRelatedEventTypes.map((eventType) => {
          const base = {
            eventType,
            catId: cat.id,
            actorUserId: actor.id,
            isTest: true,
          };
          if (eventType.startsWith("weight_"))
            return { ...base, weightId: weight.id };
          if (eventType.startsWith("tag_")) return { ...base, tagId: tag.id };
          if (eventType.startsWith("task_"))
            return { ...base, taskId: task.id };
          if (eventType.startsWith("treatment_"))
            return { ...base, treatmentId: treatment.id };
          if (eventType.startsWith("medical_note_"))
            return { ...base, medicalNoteId: medicalNote.id };
          if (
            eventType.startsWith("vaccination_") ||
            eventType === "vaccine_name_changed"
          )
            return { ...base, vaccinationId: vaccination.id };
          if (
            eventType.startsWith("parasite_treatment_") ||
            eventType === "product_name_changed"
          )
            return { ...base, parasiteTreatmentId: parasiteTreatment.id };
          if (
            eventType === "photo_created" ||
            eventType === "photo_deleted" ||
            eventType === "primary_photo_changed"
          )
            return { ...base, photoId: photo.id };
          if (
            eventType === "document_created" ||
            eventType === "document_deleted"
          )
            return { ...base, documentId: document.id };
          return { ...base, archivingReasonId: archivingReason.id };
        }),
        ...tagActions.map((action) => ({
          eventType: "action_based_tag_event",
          action,
          tagId: tag.id,
          actorUserId: actor.id,
          isTest: true,
        })),
        ...locationActions.map((action) => ({
          eventType: "action_based_location_event",
          action,
          locationId: location.id,
          actorUserId: actor.id,
          isTest: true,
        })),
        ...flightEventTypes.map((eventType) => ({
          eventType,
          flightId: flight.id,
          actorUserId: actor.id,
          isTest: true,
          ...(eventType.startsWith("flight_cat_")
            ? { catId: cat.id, assignmentId: assignment.id }
            : {}),
          ...(eventType.startsWith("flight_photo_")
            ? { flightPhotoId: flightPhoto.id }
            : {}),
        })),
      ];
      await tx.auditEvent.createMany({ data: rows });

      const config = new ConfigService({ s3: { bucketName } });
      const photoUrls = new CatPhotoUrlService(config, s3Client);
      const result = await new ListAllCatHistoryQuery(
        tx as Prisma.TransactionClient & PrismaClient,
        photoUrls,
      ).execute({
        limit: 100,
        currentUserIsTest: true,
        userId: actor.id,
      });

      const expectedEventTypes = [
        ...catEventTypes,
        ...directRelatedEventTypes,
        ...tagActions.map((action) => `tag_${action}`),
        ...locationActions.map((action) => `location_${action}`),
        ...flightEventTypes,
      ];
      expect(result.total).toBe(expectedEventTypes.length);
      expect(result.data.map((event) => event.eventType).sort()).toEqual(
        [...expectedEventTypes].sort(),
      );
      expect(
        result.data.find((event) => event.eventType === "photo_created"),
      ).toMatchObject({
        fileId: photo.id,
        fileUrl: expect.stringContaining("X-Amz-Signature="),
      });
      expect(
        result.data.find((event) => event.eventType === "document_created"),
      ).toMatchObject({
        fileId: document.id,
        fileUrl: expect.stringContaining("X-Amz-Signature="),
      });
      expect(
        result.data.find((event) => event.eventType === "flight_cat_assigned"),
      ).toMatchObject({
        catId: cat.id,
        catName: cat.name,
        catNameNumber: cat.nameNumber,
      });
      expect(
        result.data.find((event) => event.eventType === "flight_photo_created"),
      ).toMatchObject({
        flightPhotoId: flightPhoto.id,
        flightPhotoUrl: expect.stringContaining("X-Amz-Signature="),
      });
    });
  });

  it("rejects event types that do not have a DTO mapping", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({
        data: {
          email: `unknown-history-${crypto.randomUUID()}@example.com`,
          fullName: "History Actor",
        },
      });
      await tx.auditEvent.create({
        data: {
          actorUserId: actor.id,
          eventType: "unmapped_event_type",
          isTest: true,
        },
      });

      const query = new ListAllCatHistoryQuery(
        tx as Prisma.TransactionClient & PrismaClient,
        new CatPhotoUrlService(
          new ConfigService({ s3: { bucketName } }),
          s3Client,
        ),
      );
      await expect(
        query.execute({ currentUserIsTest: true, userId: actor.id }),
      ).rejects.toThrow("Unhandled event type: unmapped_event_type");
    });
  });

  it("filters history by flight ID", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({
        data: {
          email: `flight-history-${crypto.randomUUID()}@example.com`,
          fullName: "Flight History Actor",
        },
      });
      const flight = await tx.flight.create({
        data: {
          date: new Date("2026-09-05"),
          airport: "LCA",
          flightParent: "Filtered flight",
        },
      });
      const otherFlight = await tx.flight.create({
        data: {
          date: new Date("2026-09-06"),
          airport: "PFO",
          flightParent: "Other flight",
        },
      });
      await tx.auditEvent.createMany({
        data: [
          {
            actorUserId: actor.id,
            eventType: "flight_created",
            flightId: flight.id,
            isTest: true,
          },
          {
            actorUserId: actor.id,
            eventType: "flight_created",
            flightId: otherFlight.id,
            isTest: true,
          },
        ],
      });

      const result = await new ListAllCatHistoryQuery(
        tx as Prisma.TransactionClient & PrismaClient,
        new CatPhotoUrlService(
          new ConfigService({ s3: { bucketName } }),
          s3Client,
        ),
      ).execute({ flightId: flight.id, currentUserIsTest: true });

      expect(result).toMatchObject({
        total: 1,
        data: [
          expect.objectContaining({
            eventType: "flight_created",
            flightId: flight.id,
          }),
        ],
      });
    });
  });
});
