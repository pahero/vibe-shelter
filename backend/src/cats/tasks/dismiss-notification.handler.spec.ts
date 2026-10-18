import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { DismissNotificationHandler } from "./dismiss-notification.handler";

describe("DismissNotificationHandler", () => {
  it("soft deletes a notification belonging to the user and increments its version", async () => {
    await runInTestTransaction(async (transaction) => {
      const user = await transaction.user.create({ data: { email: `${Date.now()}-dismiss@example.com` } });
      const cat = await transaction.cat.create({ data: { name: `Dismiss cat ${Date.now()}` } });
      const treatment = await transaction.catTreatment.create({
        data: { catId: cat.id, createdByUserId: user.id, shortName: "Treatment", startDate: new Date(), dosesPerDay: 1 },
      });
      const notification = await transaction.taskNotification.create({ data: { treatmentId: treatment.id, userId: user.id } });
      const handler = new DismissNotificationHandler(transaction as PrismaService);

      await handler.handle(notification.id, user.id);

      await expect(transaction.taskNotification.findUniqueOrThrow({ where: { id: notification.id } })).resolves.toMatchObject({ deletedAt: expect.any(Date), version: 1 });
    });
  });

  it("does not dismiss task notifications, notifications belonging to another user, or missing notifications", async () => {
    await runInTestTransaction(async (transaction) => {
      const user = await transaction.user.create({ data: { email: `${Date.now()}-not-owner@example.com` } });
      const owner = await transaction.user.create({ data: { email: `${Date.now()}-owner@example.com` } });
      const cat = await transaction.cat.create({ data: { name: `Private cat ${Date.now()}` } });
      const task = await transaction.catTask.create({ data: { catId: cat.id, comment: "Private task", dueDate: new Date() } });
      const notification = await transaction.taskNotification.create({ data: { taskId: task.id, userId: owner.id } });
      const treatment = await transaction.catTreatment.create({
        data: { catId: cat.id, createdByUserId: owner.id, shortName: "Private treatment", startDate: new Date(), dosesPerDay: 1 },
      });
      const treatmentNotification = await transaction.taskNotification.create({ data: { treatmentId: treatment.id, userId: owner.id } });
      const handler = new DismissNotificationHandler(transaction as PrismaService);

      await expect(handler.handle(notification.id, user.id)).rejects.toThrow("Notification not found");
      await expect(handler.handle("missing", user.id)).rejects.toThrow("Notification not found");
      await expect(handler.handle(notification.id, owner.id)).rejects.toThrow("Notification not found");
      await expect(handler.handle(treatmentNotification.id, user.id)).rejects.toThrow("Notification not found");
      await expect(transaction.taskNotification.findUniqueOrThrow({ where: { id: notification.id } })).resolves.toMatchObject({ deletedAt: null, version: 0 });
      await expect(transaction.taskNotification.findUniqueOrThrow({ where: { id: treatmentNotification.id } })).resolves.toMatchObject({ deletedAt: null, version: 0 });
    });
  });
});
