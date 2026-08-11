import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CatAuditEventType } from '../cat-audit-event-types';

export type WriteCatAuditEventInput = {
  catId: string;
  actorUserId: string;
  eventType: CatAuditEventType;
  oldValue?: string | null;
  newValue?: string | null;
  photoId?: string | null;
};

@Injectable()
export class WriteCatAuditEventCommand {
  async execute(transaction: Prisma.TransactionClient, input: WriteCatAuditEventInput): Promise<void> {
    await transaction.catAuditEvent.create({
      data: {
        catId: input.catId,
        actorUserId: input.actorUserId,
        eventType: input.eventType,
        oldValue: input.oldValue ?? null,
        newValue: input.newValue ?? null,
        photoId: input.photoId ?? null,
      },
    });
  }
}
