import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { CAT_CARD_INCLUDE } from "../cats.types";
import { toCatCard } from "../cats.mappers";
import { validateCatId } from "../cats.handler-utils";

@Injectable()
export class SetPrimaryCatPhotoHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(catId: string, photoId: string, isTest: boolean) {
    validateCatId(catId);
    validateCatId(photoId, "Photo ID");
    const cat = await this.prisma.cat.findFirst({
      where: { id: catId, isTest },
      select: { id: true },
    });
    if (!cat) throw new NotFoundException("Cat not found");
    const photo = await this.prisma.catPhoto.findFirst({
      where: { id: photoId, catId, deletedAt: null },
      select: { key: true },
    });
    if (!photo) throw new NotFoundException("Photo not found");
    const updated = await this.prisma.cat.update({
      where: { id: catId },
      data: { primaryPhotoKey: photo.key },
      include: CAT_CARD_INCLUDE,
    });
    return toCatCard(updated, this.photoUrls);
  }
}
