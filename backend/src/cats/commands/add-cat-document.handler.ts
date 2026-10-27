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
import { CatPhotoCompressionService } from "../cat-photo-compression.service";

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
      throw new BadRequestException("Document file is required");
    const isPdf = document.mimetype === "application/pdf" && document.buffer.subarray(0, 5).equals(Buffer.from("%PDF-"));
    const isJpeg = document.mimetype === "image/jpeg" && document.buffer[0] === 0xff && document.buffer[1] === 0xd8 && document.buffer[2] === 0xff;
    const isPng = document.mimetype === "image/png" && document.buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!isPdf && !isJpeg && !isPng) {
      throw new BadRequestException("Document must be a PDF, JPEG, or PNG file");
    }
    const processed = isPdf ? document : (await CatPhotoCompressionService.compress(document)).full;
    const key = await this.photoUrls.uploadDocument({
      catId,
      originalName: processed.originalname,
      contentType: processed.mimetype,
      body: processed.buffer!,
    });
    try {
      const created = await runInNewTransaction(this.prisma, async (tx) => {
        const record = await tx.catDocument.create({
          data: {
            catId,
            key,
            fileName: processed.originalname ?? "document.pdf",
            createdByUserId: actorUserId,
          },
        });
        await tx.cat.update({
          where: { id: catId },
          data: { updatedAt: new Date() },
        });
        await tx.auditEvent.create({
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
