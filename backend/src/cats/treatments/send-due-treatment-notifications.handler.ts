import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";

@Injectable()
export class SendDueTreatmentNotificationsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(now = new Date()): Promise<void> {
    const treatments = await this.prisma.catTreatment.findMany({
      where: { startDate: { lte: now }, notificationSent: false, deletedAt: null, createdByUserId: { not: null } },
      select: { id: true, createdByUserId: true, concurrencyToken: true },
      take: 50,
    });
    if (treatments.length === 0) return;
    await runInNewTransaction(this.prisma, async (transaction) => {
      await transaction.taskNotification.createMany({
        data: treatments.flatMap((treatment) =>
          treatment.createdByUserId === null
            ? []
            : [{ treatmentId: treatment.id, userId: treatment.createdByUserId }],
        ),
        skipDuplicates: true,
      });
      await transaction.catTreatment.updateMany({
        where: {
          id: { in: treatments.map((treatment) => treatment.id) },
          notificationSent: false,
          deletedAt: null,
        },
        data: { notificationSent: true, concurrencyToken: crypto.randomUUID() },
      });
    });
  }
}
