import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { CatPhotoUrlService } from "../cat-photo-url.service";

@Injectable()
export class PermanentlyDeleteCatsHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(ids: string[]): Promise<{ deletedCount: number }> {
    const catIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
    if (!catIds.length)
      throw new BadRequestException("At least one cat ID is required");
    if (catIds.length > 100)
      throw new BadRequestException(
        "A maximum of 100 cats can be deleted at once",
      );

    const keys = await runInNewTransaction(this.prisma, async (tx) => {
      const cats = await tx.cat.findMany({
        where: { id: { in: catIds } },
        select: {
          id: true,
          photos: { select: { key: true, previewKey: true } },
          documents: { select: { key: true } },
        },
      });
      if (cats.length !== catIds.length) {
        const found = new Set(cats.map((cat) => cat.id));
        throw new NotFoundException(
          `Cat IDs not found: ${catIds.filter((id) => !found.has(id)).join(", ")}`,
        );
      }

      const files = cats.flatMap((cat) =>
        [
          ...cat.photos.flatMap((photo) => [photo.key, photo.previewKey]),
          ...cat.documents.map((document) => document.key),
        ].filter((key): key is string => key !== null),
      );

      // Assignment references are restrictive; deleting them also purges their audit rows.
      await tx.auditEvent.deleteMany({
        where: { assignment: { catId: { in: catIds } } },
      });
      await tx.flightCatAssignment.deleteMany({
        where: { catId: { in: catIds } },
      });
      await tx.cat.deleteMany({ where: { id: { in: catIds } } });
      return files;
    });

    // The database purge is committed before removing external objects. S3 deletion is idempotent.
    for (const key of keys) await this.photoUrls.deletePhoto(key);
    return { deletedCount: catIds.length };
  }
}
