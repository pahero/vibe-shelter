import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { runInNewTransaction } from '../../database/helpers';
import { CAT_AUDIT_EVENT_TYPES } from '../cat-audit-event-types';
import { validateCatId } from '../cats.handler-utils';

@Injectable()
export class DeleteCatDocumentHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(catId: string, documentId: string, actorUserId: string, isTest: boolean): Promise<void> {
    validateCatId(catId);
    validateCatId(documentId, 'Document ID');
    await runInNewTransaction(this.prisma, async (tx) => {
      const cat = await tx.cat.findFirst({ where: { id: catId, isTest }, select: { id: true } });
      if (!cat) throw new NotFoundException('Cat not found');
      const document = await tx.catDocument.findFirst({ where: { id: documentId, catId, deletedAt: null }, select: { id: true } });
      if (!document) throw new NotFoundException('Document not found');
      await tx.catDocument.update({ where: { id: documentId }, data: { deletedAt: new Date(), deletedByUserId: actorUserId, version: { increment: 1 } } });
      await tx.cat.update({ where: { id: catId }, data: { updatedAt: new Date() } });
      await tx.catAuditEvent.create({ data: { catId, actorUserId, eventType: CAT_AUDIT_EVENT_TYPES.documentDeleted, documentId } });
    });
  }
}
