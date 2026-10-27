import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { CAT_CARD_INCLUDE } from "../cats.types";
import { toCatCard } from "../cats.mappers";

@Injectable()
export class GetCatCardHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photoUrls: CatPhotoUrlService,
  ) {}

  async handle(id: string, isTest: boolean, userId?: string) {
    if (!id?.trim()) throw new BadRequestException("Cat ID is required");
    const cat = await this.prisma.cat.findFirst({
      where: { id, isTest },
      include: { ...CAT_CARD_INCLUDE, favorites: { where: { userId: userId ?? "" }, select: { userId: true } } },
    });
    if (!cat) throw new NotFoundException("Cat not found");
    return { ...await toCatCard(cat, this.photoUrls), isFavorite: cat.favorites.length > 0 };
  }
}
