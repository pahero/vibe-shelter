import { ConflictException, Injectable } from "@nestjs/common";
import { CatAdopterCountry, CatSex, SterilizationStatus } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { CatPhotoCompressionService } from "../cat-photo-compression.service";
import { canonicalTrelloCardUrl, trelloCardShortId } from "../trello-card-link";
import { TrelloClient } from "./trello-client";
import {
  parseCardName,
  parseDescription,
  readCheckedData,
} from "./trello-import-parser";

const IMPORT_TAGS = ["CCLAF", "sick", "planned as foster in Germany", "FIP"];

@Injectable()
export class ImportTrelloHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trello: TrelloClient,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(
    trelloUrl: string,
    userId: string,
    isTest: boolean,
    transferAdopterByColumnName = false,
    tagName: string | null = null,
  ): Promise<{ id: string }> {
    const requestedShortId = trelloCardShortId(trelloUrl);
    if (requestedShortId) {
      const existingCats = await this.prisma.cat.findMany({
        where: {
          trelloUrl: {
            startsWith: `https://trello.com/c/${requestedShortId}`,
          },
        },
        select: { id: true, name: true, nameNumber: true, trelloUrl: true },
      });
      const duplicate = existingCats.find(
        (candidate) =>
          candidate.trelloUrl &&
          trelloCardShortId(candidate.trelloUrl) === requestedShortId,
      );
      if (duplicate) throw this.duplicateCardException(duplicate);
    }

    const card = await this.trello.getCard(
      trelloUrl,
      transferAdopterByColumnName,
    );
    const cardUrl = card.shortUrl ?? `https://trello.com/c/${card.id}`;
    const possibleCardUrls = [...new Set([cardUrl, card.url, trelloUrl])];
    const possibleShortIds = [
      ...new Set(
        [...possibleCardUrls, card.id]
          .map((url) => trelloCardShortId(url))
          .filter((shortId): shortId is string => shortId !== null),
      ),
    ];
    const adopterTransfer = transferAdopterByColumnName
      ? parseAdopterTransferName(card.columnName ?? "")
      : null;
    const parsedName = parseCardName(card.name);
    const description = parseDescription(card.desc ?? "");
    const checked = readCheckedData(card.checklists ?? []);
    const labelNames = new Set(
      (card.labels ?? []).map((label) => label.name.toLocaleLowerCase()),
    );
    const vaccineRecords = [...checked.vaccines];
    if (
      labelNames.has("rabies") &&
      !vaccineRecords.some((vaccine) => vaccine.type === "RABIES")
    ) {
      vaccineRecords.push({ type: "RABIES", vaccineName: "Rabies" });
    }
    const vaccineDate = previousMonthDate();
    const locationName = adopterTransfer
      ? "Shelter"
      : (description.locationName ?? "Sanctuary");
    const preparedAttachments = await mapWithConcurrency(
      card.attachments ?? [],
      5,
      async (attachment) => {
        if (!attachment.url) return null;
        try {
          const name =
            attachment.name ??
            new URL(attachment.url).pathname.split("/").pop() ??
            "attachment";
          const extension = name.split(".").pop()?.toLowerCase();
          const declaredType = attachment.mimeType?.toLowerCase() ?? "";
          const videoType:
            | "video/mp4"
            | "video/webm"
            | "video/quicktime"
            | null = declaredType.startsWith("video/")
            ? declaredType === "video/mp4" ||
              declaredType === "video/webm" ||
              declaredType === "video/quicktime"
              ? (declaredType as "video/mp4" | "video/webm" | "video/quicktime")
              : null
            : extension === "mp4"
              ? "video/mp4"
              : extension === "webm"
                ? "video/webm"
                : extension === "mov"
                  ? "video/quicktime"
                  : null;
          if (declaredType.startsWith("video/") && !videoType) return null;
          const download = await this.trello.downloadAttachment(attachment.url);
          const mimeType = videoType ?? (declaredType || download.contentType);
          if (mimeType === "application/pdf" || extension === "pdf") {
            return { kind: "document" as const, name, bytes: download.bytes };
          }
          if (videoType) {
            const suffix =
              videoType === "video/mp4"
                ? "mp4"
                : videoType === "video/webm"
                  ? "webm"
                  : "mov";
            return {
              kind: "video" as const,
              name,
              storedName: `${name.replace(/\.[^/.]+$/, "")}.${suffix}`,
              bytes: download.bytes,
              contentType: videoType as
                | "video/mp4"
                | "video/webm"
                | "video/quicktime",
            };
          }
          const extensionImageType =
            extension === "png"
              ? "image/png"
              : extension === "webp"
                ? "image/webp"
                : extension === "gif"
                  ? "image/gif"
                  : extension === "jpg" || extension === "jpeg"
                    ? "image/jpeg"
                    : null;
          const photoMimeType = mimeType.startsWith("image/")
            ? mimeType
            : download.contentType.startsWith("image/")
              ? download.contentType
              : (extensionImageType ?? "image/jpeg");
          const compressed = await CatPhotoCompressionService.compress({
            buffer: download.bytes,
            originalname: name,
            mimetype: photoMimeType,
          });
          return { kind: "photo" as const, name, compressed };
        } catch (error) {
          console.error(
            `Trello attachment preparation failed (${attachment.name ?? "unnamed attachment"}): ${error instanceof Error ? error.message : String(error)}`,
          );
          return null;
        }
      },
    );

    const imported = await runInNewTransaction(this.prisma, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`trello:${card.id}`}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${isTest}:${parsedName.name}`}))`;
      let archivingReason = adopterTransfer
        ? await tx.catArchivingReason.findFirst({
            where: {
              name: adopterTransfer.reasonName,
              isTest,
              deletedAt: null,
            },
            select: { id: true },
          })
        : null;
      if (adopterTransfer && !archivingReason) {
        archivingReason = await tx.catArchivingReason.create({
          data: { name: adopterTransfer.reasonName, isTest },
          select: { id: true },
        });
        await tx.auditEvent.create({
          data: {
            archivingReasonId: archivingReason.id,
            actorUserId: userId,
            isTest,
            eventType: CAT_AUDIT_EVENT_TYPES.archivingReasonCreate,
          },
        });
      }
      const possibleDuplicates = await tx.cat.findMany({
        where: {
          OR: [
            { trelloUrl: { in: possibleCardUrls } },
            ...possibleShortIds.map((shortId) => ({
              trelloUrl: { startsWith: `https://trello.com/c/${shortId}` },
            })),
          ],
        },
        select: { id: true, name: true, nameNumber: true, trelloUrl: true },
      });
      const duplicate = possibleDuplicates.find((candidate) => {
        if (!candidate.trelloUrl) return false;
        return possibleShortIds.includes(
          trelloCardShortId(candidate.trelloUrl) ?? "",
        );
      });
      if (duplicate) throw this.duplicateCardException(duplicate);
      if (checked.microchipNumber) {
        const chipCat = await tx.cat.findUnique({
          where: { microchipNumber: checked.microchipNumber },
          select: { id: true, name: true },
        });
        if (chipCat)
          throw new ConflictException(
            "A cat with this microchip number already exists",
          );
      }
      const highestNumber = await tx.cat.aggregate({
        where: { name: parsedName.name, isTest },
        _max: { nameNumber: true },
      });
      const nameNumber =
        parsedName.nameNumber ?? (highestNumber._max.nameNumber ?? 0) + 1;
      const sameNameNumber = await tx.cat.findFirst({
        where: { name: parsedName.name, nameNumber, isTest },
        select: { id: true },
      });
      if (sameNameNumber)
        throw new ConflictException(
          "A cat with this name and number already exists",
        );

      const activeLocations = await tx.location.findMany({
        where: { isTest, status: "ACTIVE", deletedAt: null },
        select: { id: true, name: true },
      });
      let location = activeLocations.find(
        (candidate) =>
          locationKey(candidate.name) === locationKey(locationName),
      );
      if (!location) {
        location = await tx.location.create({
          data: { name: locationName, isTest, status: "ACTIVE" },
          select: { id: true, name: true },
        });
        await tx.auditEvent.create({
          data: {
            locationId: location.id,
            actorUserId: userId,
            action: "create",
            eventType: "location_action",
          },
        });
      }
      await tx.location.update({
        where: { id: location.id },
        data: { version: { increment: 1 } },
      });

      const cat = await tx.cat.create({
        data: {
          name: parsedName.name,
          nameNumber,
          trelloUrl: canonicalTrelloCardUrl(cardUrl),
          sex: labelNames.has("male")
            ? CatSex.MALE
            : labelNames.has("female")
              ? CatSex.FEMALE
              : CatSex.UNKNOWN,
          sterilizationStatus: labelNames.has("neutered")
            ? SterilizationStatus.STERILIZED
            : SterilizationStatus.UNKNOWN,
          sponsorName: description.sponsorName,
          intakeDetails: card.desc.trim() || null,
          microchipNumber: checked.microchipNumber,
          passport: checked.passport,
          adopterName: checked.adopterName,
          adopterAddress: checked.adopterAddress,
          adopterDetails: checked.adopterDetails,
          flightDetails: checked.flightDetails,
          preparationFeePaid: checked.preparationFeePaid,
          flightFeePaid: checked.flightFeePaid,
          adoptionContract: checked.adoptionContract,
          adopterCountry: adopterTransfer?.country ?? null,
          archivedAt: adopterTransfer?.archivedAt ?? null,
          archivingReasonId: archivingReason?.id ?? null,
          felvFivTestDone: checked.felvFivTestDone,
          currentLocationId: location.id,
          createdByUserId: userId,
          isTest,
        },
        select: { id: true },
      });
      await tx.auditEvent.create({
        data: {
          catId: cat.id,
          actorUserId: userId,
          isTest,
          eventType: CAT_AUDIT_EVENT_TYPES.catCreated,
        },
      });

      const desiredTags = [
        ...new Set([
          ...IMPORT_TAGS.filter((name) =>
            labelNames.has(name.toLocaleLowerCase()),
          ),
          ...(tagName?.trim() ? [tagName.trim()] : []),
        ]),
      ];
      for (const name of desiredTags) {
        let tag = await tx.catTag.findFirst({
          where: { name, isTest },
          select: { id: true, deletedAt: true },
        });
        if (!tag) {
          tag = await tx.catTag.create({
            data: { name, isTest },
            select: { id: true, deletedAt: true },
          });
          await tx.auditEvent.create({
            data: {
              tagId: tag.id,
              actorUserId: userId,
              isTest,
              action: "create",
              eventType: "tag_action",
            },
          });
        } else if (tag.deletedAt) {
          tag = await tx.catTag.update({
            where: { id: tag.id },
            data: { deletedAt: null, version: { increment: 1 } },
            select: { id: true, deletedAt: true },
          });
          await tx.auditEvent.create({
            data: {
              tagId: tag.id,
              actorUserId: userId,
              isTest,
              action: "restore",
              eventType: "tag_action",
            },
          });
        }
        await tx.catTagOnCat.create({ data: { catId: cat.id, tagId: tag.id } });
        await tx.cat.update({
          where: { id: cat.id },
          data: { version: { increment: 1 } },
        });
        await tx.catTag.update({
          where: { id: tag.id },
          data: { version: { increment: 1 } },
        });
      }

      for (const vaccine of vaccineRecords) {
        await tx.cat.update({
          where: { id: cat.id },
          data: { version: { increment: 1 } },
        });
        await tx.vaccination.create({
          data: {
            catId: cat.id,
            createdByUserId: userId,
            updatedByUserId: userId,
            type: vaccine.type,
            date: adopterTransfer
              ? adopterTransferVaccineDate(
                  vaccine.vaccineName,
                  adopterTransfer.archivedAt.getUTCFullYear(),
                  vaccineDate,
                )
              : vaccineDate,
            vaccineName: vaccine.vaccineName,
          },
        });
      }

      let firstMediaKey: string | null = null;
      let trelloCoverKey: string | null = null;
      for (const [index, attachment] of preparedAttachments.entries()) {
        if (!attachment) continue;
        const isCover =
          card.attachments?.[index]?.id !== undefined &&
          card.attachments?.[index]?.id === card.cover?.idAttachment;
        if (attachment.kind === "document") {
          const key = await this.photoUrls.uploadDocument({
            catId: cat.id,
            originalName: attachment.name,
            contentType: "application/pdf",
            body: attachment.bytes,
          });
          await tx.catDocument.create({
            data: {
              catId: cat.id,
              key,
              fileName: attachment.name,
              createdByUserId: userId,
            },
          });
        } else if (attachment.kind === "video") {
          const key = await this.photoUrls.uploadVideo({
            catId: cat.id,
            originalName: attachment.storedName,
            contentType: attachment.contentType,
            body: attachment.bytes,
          });
          await tx.catPhoto.create({
            data: {
              catId: cat.id,
              key,
              fileName: attachment.name,
              createdByUserId: userId,
            },
          });
          firstMediaKey ??= key;
          if (isCover) trelloCoverKey = key;
        } else {
          const variants = await this.photoUrls.uploadPhotoVariants({
            catId: cat.id,
            originalName: attachment.compressed.full.originalname,
            contentType: attachment.compressed.full.mimetype,
            fullBody: attachment.compressed.full.buffer,
            previewBody: attachment.compressed.preview.buffer,
          });
          await tx.catPhoto.create({
            data: {
              catId: cat.id,
              key: variants.key,
              previewKey: variants.previewKey,
              fileName: attachment.compressed.full.originalname,
              createdByUserId: userId,
            },
          });
          firstMediaKey ??= variants.key;
          if (isCover) trelloCoverKey = variants.key;
        }
      }
      const primaryPhotoKey = trelloCoverKey ?? firstMediaKey;
      if (primaryPhotoKey) {
        await tx.cat.update({
          where: { id: cat.id },
          data: {
            version: { increment: 1 },
            primaryPhotoKey,
          },
        });
      }
      return { id: cat.id };
    });
    return imported;
  }

  private duplicateCardException(duplicate: {
    id: string;
    name: string;
    nameNumber: number;
  }): ConflictException {
    return new ConflictException({
      message: `A cat with this Trello card already exists. [duplicateCatId=${duplicate.id}]`,
      duplicateCat: {
        id: duplicate.id,
        name: duplicate.name,
        nameNumber: duplicate.nameNumber,
      },
    });
  }
}

function adopterTransferVaccineDate(
  vaccineName: string,
  year: number,
  fallback: Date,
): Date {
  if (vaccineName === "First vaccination")
    return new Date(Date.UTC(year, 8, 1));
  if (vaccineName === "Second vaccination" || vaccineName === "Rabies")
    return new Date(Date.UTC(year, 8, 22));
  return fallback;
}

function parseAdopterTransferName(value: string): {
  country: CatAdopterCountry;
  reasonName: string;
  archivedAt: Date;
} {
  const normalizedName = value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .trim();
  const match = normalizedName.match(/^([A-Za-z]{2})(.*?)(\d{4})\s*$/);
  if (!match)
    throw new ConflictException(
      `Trello column name "${value}" must start with a country code and end with a four-digit adoption year`,
    );
  const code = match[1].toUpperCase();
  const countryByCode: Record<string, CatAdopterCountry> = {
    CY: CatAdopterCountry.CY,
    EU: CatAdopterCountry.EU,
    UK: CatAdopterCountry.UK,
    DE: CatAdopterCountry.EU,
    CH: CatAdopterCountry.EU,
  };
  const country = countryByCode[code];
  if (!country)
    throw new ConflictException(`Country code "${code}" is not supported`);
  const reasonByCode: Record<string, string> = {
    CY: "Adopted in CY",
    DE: "Adopted in Germany",
    CH: "Adopted in Switzerland",
    EU: "Adopted in the EU",
    UK: "Adopted in the UK",
  };
  const year = Number(match[3]);
  const currentYear = new Date().getUTCFullYear();
  if (year < 1900 || year > currentYear)
    throw new ConflictException(`Adoption year "${match[3]}" is invalid`);
  return {
    country,
    reasonName: reasonByCode[code],
    archivedAt: new Date(Date.UTC(year, 0, 1)),
  };
}

function previousMonthDate(): Date {
  const date = new Date();
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - 1);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date;
}

function locationKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = Array.from({ length: items.length }) as R[];
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await mapper(items[index]);
      }
    }),
  );
  return results;
}
