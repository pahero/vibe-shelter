import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CAT_AUDIT_EVENT_TYPES } from "../cat-audit-event-types";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { CatPhoto, PrimaryPhotoUpload } from "../cats.types";
import { toCatPhoto } from "../cats.mappers";
import { CatPhotoCompressionService } from "../cat-photo-compression.service";

@Injectable()
export class AddCatPhotoHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(
    catId: string,
    photo: PrimaryPhotoUpload | undefined,
    actorUserId: string | undefined,
    isTest: boolean,
  ): Promise<CatPhoto> {
    if (!catId?.trim()) throw new BadRequestException("Cat ID is required");
    const cat = await this.prisma.cat.findFirst({
      where: { id: catId, isTest },
      select: { primaryPhotoKey: true },
    });
    if (!cat) throw new NotFoundException("Cat not found");
    if (!photo?.buffer?.length)
      throw new BadRequestException("Photo file is required");
    const isMp4 =
      photo.mimetype === "video/mp4" &&
      (!photo.originalname ||
        photo.originalname.toLowerCase().endsWith(".mp4"));
    const isWebm =
      photo.mimetype === "video/webm" &&
      (!photo.originalname ||
        photo.originalname.toLowerCase().endsWith(".webm"));
    const isQuickTime =
      photo.mimetype === "video/quicktime" &&
      (!photo.originalname ||
        photo.originalname.toLowerCase().endsWith(".mov"));
    if (
      photo.mimetype?.startsWith("video/") &&
      !isMp4 &&
      !isWebm &&
      !isQuickTime
    )
      throw new BadRequestException(
        "Only MP4, WebM, and MOV videos are supported",
      );
    let key: string;
    let previewKey: string | null = null;
    if (isMp4 || isWebm || isQuickTime) {
      key = await this.photoUrls.uploadVideo({
        catId,
        originalName:
          photo.originalname ??
          (isMp4 ? "video.mp4" : isWebm ? "video.webm" : "video.mov"),
        contentType: isMp4
          ? "video/mp4"
          : isWebm
            ? "video/webm"
            : "video/quicktime",
        body: photo.buffer,
      });
    } else {
      if (!photo.mimetype?.startsWith("image/"))
        throw new BadRequestException(
          "Only image, MP4, and WebM files are supported",
        );
      const compressed = await CatPhotoCompressionService.compress(photo);
      const variants = await this.photoUrls.uploadPhotoVariants({
        catId,
        originalName: compressed.full.originalname,
        contentType: compressed.full.mimetype,
        fullBody: compressed.full.buffer,
        previewBody: compressed.preview.buffer,
      });
      key = variants.key;
      previewKey = variants.previewKey;
    }
    const created = await runInNewTransaction(this.prisma, async (tx) => {
      const result = await tx.catPhoto.create({
        data: { catId, key, previewKey, createdByUserId: actorUserId ?? null },
      });
      if (!cat.primaryPhotoKey)
        await tx.cat.update({
          where: { id: catId },
          data: { primaryPhotoKey: key },
        });
      if (actorUserId)
        await tx.auditEvent.create({
          data: {
            catId,
            actorUserId,
            eventType: CAT_AUDIT_EVENT_TYPES.photoCreated,
            photoId: result.id,
          },
        });
      return result;
    });
    return toCatPhoto(created, cat.primaryPhotoKey ?? key, this.photoUrls);
  }
}
