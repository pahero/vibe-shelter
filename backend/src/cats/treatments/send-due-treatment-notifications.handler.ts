import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInNewTransaction } from "../../database/helpers";
import { PushNotificationService } from "../tasks/push-notification.service";

@Injectable()
export class SendDueTreatmentNotificationsHandler {
  constructor(private readonly prisma: PrismaService, private readonly push: PushNotificationService) {}

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
    const recipients = new Set(treatments.flatMap((treatment) => treatment.createdByUserId ? [treatment.createdByUserId] : []));
    await Promise.all([...recipients].map((userId) => this.push.sendToUser(userId, {
      title: "Shelter treatment reminder",
      body: "A cat treatment has started.",
      url: "/notifications",
    })));
  }
}
