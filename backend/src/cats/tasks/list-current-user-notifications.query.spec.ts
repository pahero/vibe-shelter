import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListCurrentUserNotificationsQuery } from "./list-current-user-notifications.query";

describe("ListCurrentUserNotificationsQuery", () => {
  it("returns paginated notifications for the current user with cat ids", async () => {
    await runInTestTransaction(async (transaction) => {
      const user = await transaction.user.create({
        data: { email: `${Date.now()}-user@example.com` },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const task = await transaction.catTask.create({
        data: { catId: cat.id, comment: "Medication", dueDate: new Date() },
      });
      await transaction.taskNotification.create({ data: { taskId: task.id, userId: user.id } });
      const query = new ListCurrentUserNotificationsQuery(transaction as PrismaService);

      await expect(query.handle(user.id, false, 0, 10)).resolves.toEqual({
        data: [expect.objectContaining({ taskId: task.id, catId: cat.id, comment: "Medication" })],
        total: 1,
        skip: 0,
        limit: 10,
      });
    });
  });

  it("excludes notifications from another user partition", async () => {
    await runInTestTransaction(async (transaction) => {
      const user = await transaction.user.create({
        data: { email: `${Date.now()}-user@example.com` },
      });
      const testCat = await transaction.cat.create({
        data: { name: `Test cat ${Date.now()}`, isTest: true },
      });
      const task = await transaction.catTask.create({
        data: { catId: testCat.id, comment: "Test", dueDate: new Date() },
      });
      await transaction.taskNotification.create({ data: { taskId: task.id, userId: user.id } });
      const query = new ListCurrentUserNotificationsQuery(transaction as PrismaService);

      await expect(query.handle(user.id, false, 0, 10)).resolves.toEqual({
        data: [],
        total: 0,
        skip: 0,
        limit: 10,
      });
    });
  });
});
