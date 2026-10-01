import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { CatDocument, PrimaryPhotoUpload } from "../cats.types";
import { toCatDocument } from "../cats.mappers";

@Injectable()
export class AddCatDocumentHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(
    catId: string,
    document: PrimaryPhotoUpload | undefined,
    actorUserId: string,
    isTest: boolean,
  ): Promise<CatDocument> {
    if (!catId?.trim()) throw new BadRequestException("Cat ID is required");
    const cat = await this.prisma.cat.findFirst({
      where: { id: catId, isTest },
      select: { id: true },
    });
    if (!cat) throw new NotFoundException("Cat not found");
    if (!document?.buffer?.length)
      throw new BadRequestException("PDF document file is required");
    if (
      document.mimetype !== "application/pdf" ||
      !document.buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))
    ) {
      throw new BadRequestException("Document must be a PDF file");
    }
    const key = await this.photoUrls.uploadDocument({
      catId,
      originalName: document.originalname,
      body: document.buffer,
    });
    try {
      const created = await runInNewTransaction(this.prisma, async (tx) => {
        const record = await tx.catDocument.create({
          data: {
            catId,
            key,
            fileName: document.originalname ?? "document.pdf",
            createdByUserId: actorUserId,
          },
        });
        await tx.cat.update({
          where: { id: catId },
          data: { updatedAt: new Date() },
        });
        await tx.catAuditEvent.create({
          data: {
            catId,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.documentCreated,
            documentId: record.id,
          },
        });
        return record;
      });
      return toCatDocument(created, this.photoUrls);
    } catch (error) {
      await this.photoUrls.deleteDocument(key);
      throw error;
    }
  }
}
