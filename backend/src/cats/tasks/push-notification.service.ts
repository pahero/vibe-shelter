import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import webpush from "web-push";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  readonly publicKey: string | null;

  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    const publicKey = config.get<string>("webPush.publicKey");
    const privateKey = config.get<string>("webPush.privateKey");
    const subject = config.get<string>("webPush.subject", "mailto:admin@example.com");
    this.publicKey = publicKey && privateKey ? publicKey : null;
    if (publicKey && privateKey) webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  async sendToUser(userId: string, notification: { title: string; body: string; url: string }): Promise<void> {
    if (!this.publicKey) return;
    const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId } });
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(notification));
      } catch (error) {
        const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? error.statusCode : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await this.prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
          return;
        }
        this.logger.warn(`Push delivery failed for subscription ${subscription.id}`);
      }
    }));
  }
}
