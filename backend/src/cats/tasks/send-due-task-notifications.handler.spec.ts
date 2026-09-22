import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { SendDueTaskNotificationsHandler } from "./send-due-task-notifications.handler";

describe("SendDueTaskNotificationsHandler", () => {
  it("does not send notifications before a task is due", async () => {
    await runInTestTransaction(async (transaction) => {
      const receiver = await transaction.user.create({
        data: { email: `${Date.now()}-receiver@example.com` },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const task = await transaction.catTask.create({
        data: { catId: cat.id, comment: "Future", dueDate: new Date("2030-01-01T00:00:00.000Z") },
      });
      await transaction.catTaskReceiver.create({ data: { taskId: task.id, userId: receiver.id } });
      const handler = new SendDueTaskNotificationsHandler(transaction as PrismaService);

      await handler.handle(new Date("2020-01-01T00:00:00.000Z"));

      await expect(
        transaction.taskNotification.count({ where: { taskId: task.id } }),
      ).resolves.toBe(0);
      await expect(
        transaction.catTask.findUniqueOrThrow({ where: { id: task.id } }),
      ).resolves.toMatchObject({ notificationSentAt: null });
    });
  });

  it("sends overdue task notifications and records the task sent time", async () => {
    await runInTestTransaction(async (transaction) => {
      const receiver = await transaction.user.create({
        data: { email: `${Date.now()}-receiver@example.com` },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const task = await transaction.catTask.create({
        data: { catId: cat.id, comment: "Overdue", dueDate: new Date("2020-01-01T00:00:00.000Z") },
      });
      await transaction.catTaskReceiver.create({ data: { taskId: task.id, userId: receiver.id } });
      const handler = new SendDueTaskNotificationsHandler(transaction as PrismaService);

      await handler.handle(new Date("2020-01-02T00:00:00.000Z"));

      await expect(
        transaction.taskNotification.findUniqueOrThrow({
          where: { taskId_userId: { taskId: task.id, userId: receiver.id } },
        }),
      ).resolves.toBeDefined();
      await expect(
        transaction.catTask.findUniqueOrThrow({ where: { id: task.id } }),
      ).resolves.toMatchObject({ notificationSentAt: new Date("2020-01-02T00:00:00.000Z") });
    });
  });
});
