import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { runInNewTransaction } from "../../database/helpers";
import { PrismaService } from "../../database/prisma.service";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { canonicalTrelloCardUrl, trelloCardShortId } from "../trello-card-link";
import { prepareTrelloAttachments } from "./prepare-trello-attachments";
import { TrelloClient } from "./trello-client";

@Injectable()
export class ImportTrelloAttachmentsHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trello: TrelloClient,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(
    trelloUrl: string,
    userId: string,
    isTest: boolean,
  ): Promise<{ id: string }> {
    const card = await this.trello.getCard(trelloUrl);
    const canonicalUrl = canonicalTrelloCardUrl(card.shortUrl ?? trelloUrl);
    const shortId = trelloCardShortId(canonicalUrl);
    if (!shortId)
      throw new NotFoundException("No cat is linked to this Trello card");
    const possibleCats = await this.prisma.cat.findMany({
      where: {
        isTest,
        deletedAt: null,
        trelloUrl: { startsWith: canonicalUrl },
      },
      select: {
        id: true,
        trelloUrl: true,
        concurrencyToken: true,
      },
    });
    const cat = possibleCats.find(
      (candidate) =>
        candidate.trelloUrl !== null &&
        trelloCardShortId(candidate.trelloUrl) === shortId,
    );
    if (!cat)
      throw new NotFoundException("No cat is linked to this Trello card");

    const prepared = await prepareTrelloAttachments(
      this.trello,
      card.attachments ?? [],
    );
    const stored: Array<
      | { kind: "document"; name: string; key: string }
      | { kind: "video"; name: string; key: string }
      | { kind: "photo"; name: string; key: string; previewKey: string }
    > = [];
    const uploadedKeys: string[] = [];

    for (const attachment of prepared) {
      if (!attachment) continue;
      try {
        if (attachment.kind === "document") {
          const key = await this.photoUrls.uploadDocument({
            catId: cat.id,
            originalName: attachment.name,
            contentType: "application/pdf",
            body: attachment.bytes,
          });
          uploadedKeys.push(key);
          stored.push({ kind: "document", name: attachment.name, key });
        } else if (attachment.kind === "video") {
          const key = await this.photoUrls.uploadVideo({
            catId: cat.id,
            originalName: attachment.storedName,
            contentType: attachment.contentType,
            body: attachment.bytes,
          });
          uploadedKeys.push(key);
          stored.push({ kind: "video", name: attachment.name, key });
        } else {
          const variants = await this.photoUrls.uploadPhotoVariants({
            catId: cat.id,
            originalName: attachment.compressed.full.originalname,
            contentType: attachment.compressed.full.mimetype,
            fullBody: attachment.compressed.full.buffer,
            previewBody: attachment.compressed.preview.buffer,
          });
          uploadedKeys.push(variants.key, variants.previewKey);
          stored.push({
            kind: "photo",
            name: attachment.compressed.full.originalname,
            key: variants.key,
            previewKey: variants.previewKey,
          });
        }
      } catch (error) {
        console.error(
          `Trello attachment upload failed for cat ${cat.id} (${attachment.name}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // An empty card intentionally clears imported files. A non-empty card whose
    // attachments all failed or were unsupported must leave the current files alone.
    if ((card.attachments?.length ?? 0) > 0 && stored.length === 0) {
      throw new BadRequestException(
        "No Trello attachments could be imported; existing files were left unchanged",
      );
    }

    try {
      return await runInNewTransaction(this.prisma, async (tx) => {
        const currentCat = await tx.cat.findFirst({
          where: { id: cat.id, isTest, deletedAt: null },
          select: {
            id: true,
            primaryPhotoKey: true,
            concurrencyToken: true,
          },
        });
        if (!currentCat)
          throw new NotFoundException("No cat is linked to this Trello card");
        if (currentCat.concurrencyToken !== cat.concurrencyToken)
          throw new ConflictException(
            "The cat changed while Trello attachments were being prepared",
          );

        const now = new Date();
        const [oldPhotos, oldDocuments] = await Promise.all([
          tx.catPhoto.findMany({
            where: { catId: cat.id, deletedAt: null },
            select: { id: true },
          }),
          tx.catDocument.findMany({
            where: { catId: cat.id, deletedAt: null },
            select: { id: true },
          }),
        ]);
        if (oldPhotos.length > 0) {
          await tx.catPhoto.updateMany({
            where: { catId: cat.id, deletedAt: null },
            data: {
              deletedAt: now,
              deletedByUserId: userId,
              version: { increment: 1 },
            },
          });
          await tx.auditEvent.createMany({
            data: oldPhotos.map(({ id: photoId }) => ({
              catId: cat.id,
              photoId,
              actorUserId: userId,
              isTest,
              eventType: CAT_AUDIT_EVENT_TYPES.photoDeleted,
            })),
          });
        }
        if (oldDocuments.length > 0) {
          await tx.catDocument.updateMany({
            where: { catId: cat.id, deletedAt: null },
            data: {
              deletedAt: now,
              deletedByUserId: userId,
              version: { increment: 1 },
            },
          });
          await tx.auditEvent.createMany({
            data: oldDocuments.map(({ id: documentId }) => ({
              catId: cat.id,
              documentId,
              actorUserId: userId,
              isTest,
              eventType: CAT_AUDIT_EVENT_TYPES.documentDeleted,
            })),
          });
        }

        let firstPhotoKey: string | null = null;
        for (const attachment of stored) {
          if (attachment.kind === "document") {
            const document = await tx.catDocument.create({
              data: {
                catId: cat.id,
                key: attachment.key,
                fileName: attachment.name,
                createdByUserId: userId,
              },
              select: { id: true },
            });
            await tx.auditEvent.create({
              data: {
                catId: cat.id,
                documentId: document.id,
                actorUserId: userId,
                isTest,
                eventType: CAT_AUDIT_EVENT_TYPES.documentCreated,
              },
            });
          } else {
            const photo = await tx.catPhoto.create({
              data: {
                catId: cat.id,
                key: attachment.key,
                ...(attachment.kind === "photo"
                  ? { previewKey: attachment.previewKey }
                  : {}),
                fileName: attachment.name,
                createdByUserId: userId,
              },
              select: { id: true },
            });
            await tx.auditEvent.create({
              data: {
                catId: cat.id,
                photoId: photo.id,
                actorUserId: userId,
                isTest,
                eventType: CAT_AUDIT_EVENT_TYPES.photoCreated,
              },
            });
            firstPhotoKey ??= attachment.key;
          }
        }

        if (
          oldPhotos.length > 0 ||
          oldDocuments.length > 0 ||
          stored.length > 0
        ) {
          const updated = await tx.cat.updateMany({
            where: {
              id: cat.id,
              isTest,
              deletedAt: null,
              concurrencyToken: currentCat.concurrencyToken,
            },
            data: {
              version: { increment: 1 },
              concurrencyToken: randomUUID(),
              primaryPhotoKey: firstPhotoKey,
              primaryPhotoPositionY: null,
            },
          });
          if (updated.count !== 1)
            throw new ConflictException(
              "The cat changed while Trello attachments were being imported",
            );
        }
        return { id: cat.id };
      });
    } catch (error) {
      await Promise.all(
        uploadedKeys.map(async (key) => {
          try {
            await this.photoUrls.deletePhoto(key);
          } catch (cleanupError) {
            console.error(
              `Failed to clean up Trello attachment object ${key}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
            );
          }
        }),
      );
      throw error;
    }
  }
}
