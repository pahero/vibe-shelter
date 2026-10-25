import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { SendDueTreatmentNotificationsHandler } from "./send-due-treatment-notifications.handler";
import { PushNotificationService } from "../tasks/push-notification.service";

describe("SendDueTreatmentNotificationsHandler", () => {
  it("notifies the creator when a treatment has started", async () => {
    await runInTestTransaction(async (transaction) => {
      const user = await transaction.user.create({ data: { email: `${Date.now()}-creator@example.com` } });
      const cat = await transaction.cat.create({ data: { name: `Treatment cat ${Date.now()}` } });
      const treatment = await transaction.catTreatment.create({
        data: { catId: cat.id, createdByUserId: user.id, updatedByUserId: user.id, shortName: "Medicine", startDate: new Date("2020-01-01T00:00:00.000Z"), dosesPerDay: 1 },
      });
      const handler = new SendDueTreatmentNotificationsHandler(transaction as PrismaService, { sendToUser: async () => undefined } as unknown as PushNotificationService);

      await handler.handle(new Date("2020-01-02T00:00:00.000Z"));

      await expect(transaction.taskNotification.findUniqueOrThrow({ where: { treatmentId_userId: { treatmentId: treatment.id, userId: user.id } } })).resolves.toBeDefined();
      await expect(transaction.catTreatment.findUniqueOrThrow({ where: { id: treatment.id } })).resolves.toMatchObject({ notificationSent: true });
    });
  });

  it("does not notify for a future treatment", async () => {
    await runInTestTransaction(async (transaction) => {
      const user = await transaction.user.create({ data: { email: `${Date.now()}-future-creator@example.com` } });
      const cat = await transaction.cat.create({ data: { name: `Future treatment cat ${Date.now()}` } });
      const treatment = await transaction.catTreatment.create({
        data: { catId: cat.id, createdByUserId: user.id, updatedByUserId: user.id, shortName: "Future medicine", startDate: new Date("2030-01-01T00:00:00.000Z"), dosesPerDay: 1 },
      });
      const handler = new SendDueTreatmentNotificationsHandler(transaction as PrismaService, { sendToUser: async () => undefined } as unknown as PushNotificationService);

      await handler.handle(new Date("2020-01-01T00:00:00.000Z"));

      await expect(transaction.taskNotification.count({ where: { treatmentId: treatment.id } })).resolves.toBe(0);
      await expect(transaction.catTreatment.findUniqueOrThrow({ where: { id: treatment.id } })).resolves.toMatchObject({ notificationSent: false });
    });
  });
});
