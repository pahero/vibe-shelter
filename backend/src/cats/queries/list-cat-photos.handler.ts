import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { toCatPhoto } from '../cats.mappers';
import { validateCatId } from '../cats.handler-utils';

@Injectable()
export class ListCatPhotosHandler {
  constructor(private readonly prisma: PrismaService, private readonly photoUrls: CatPhotoUrlService) {}

  async handle(catId: string, isTest: boolean) {
    validateCatId(catId);
    const cat = await this.prisma.cat.findFirst({ where: { id: catId, isTest }, select: { primaryPhotoKey: true } });
    if (!cat) throw new NotFoundException('Cat not found');
    const photos = await this.prisma.catPhoto.findMany({ where: { catId, deletedAt: null }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    return Promise.all(photos.map((photo) => toCatPhoto(photo, cat.primaryPhotoKey, this.photoUrls)));
  }
}
