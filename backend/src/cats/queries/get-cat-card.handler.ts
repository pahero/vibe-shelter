import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { CAT_CARD_INCLUDE } from '../cats.types';
import { toCatCard } from '../cats.mappers';

@Injectable()
export class GetCatCardHandler {
  constructor(private readonly prisma: PrismaService, private readonly photoUrls: CatPhotoUrlService) {}

  async handle(id: string, isTest: boolean) {
    if (!id?.trim()) throw new BadRequestException('Cat ID is required');
    const cat = await this.prisma.cat.findFirst({ where: { id, isTest }, include: CAT_CARD_INCLUDE });
    if (!cat) throw new NotFoundException('Cat not found');
    return toCatCard(cat, this.photoUrls);
  }
}
