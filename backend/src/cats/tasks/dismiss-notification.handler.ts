import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class DismissNotificationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async handle(notificationId: string, userId: string): Promise<void> {
    const result = await this.prisma.taskNotification.updateMany({
      where: { id: notificationId, userId, treatmentId: { not: null }, deletedAt: null },
      data: { deletedAt: new Date(), version: { increment: 1 } },
    });
    if (result.count !== 1) throw new NotFoundException("Notification not found");
  }
}
