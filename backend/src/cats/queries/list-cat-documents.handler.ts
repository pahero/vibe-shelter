import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CatPhotoUrlService } from '../cat-photo-url.service';
import { toCatDocument } from '../cats.mappers';
import { validateCatId } from '../cats.handler-utils';

@Injectable()
export class ListCatDocumentsHandler {
  constructor(private readonly prisma: PrismaService, private readonly photoUrls: CatPhotoUrlService) {}

  async handle(catId: string, isTest: boolean) {
    validateCatId(catId);
    const cat = await this.prisma.cat.findFirst({ where: { id: catId, isTest }, select: { id: true } });
    if (!cat) throw new NotFoundException('Cat not found');
    const documents = await this.prisma.catDocument.findMany({ where: { catId, deletedAt: null }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    return Promise.all(documents.map((document) => toCatDocument(document, this.photoUrls)));
  }
}
