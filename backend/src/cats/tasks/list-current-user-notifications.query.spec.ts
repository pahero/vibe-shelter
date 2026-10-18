import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListCurrentUserNotificationsQuery } from "./list-current-user-notifications.query";

describe("ListCurrentUserNotificationsQuery", () => {
  it("returns paginated notifications for the current user with cat ids", async () => {
    await runInTestTransaction(async (transaction) => {
      const user = await transaction.user.create({
        data: { email: `${Date.now()}-user@example.com` },
      });
      const cat = await transaction.cat.create({
        data: { name: `Cat ${Date.now()}` },
      });
      const task = await transaction.catTask.create({
        data: { catId: cat.id, comment: "Medication", dueDate: new Date() },
      });
      await transaction.taskNotification.create({
        data: { taskId: task.id, userId: user.id },
      });
      const query = new ListCurrentUserNotificationsQuery(
        transaction as PrismaService,
      );

      await expect(query.handle(user.id, false, 0, 10)).resolves.toEqual({
        data: [
          expect.objectContaining({
            taskId: task.id,
            catId: cat.id,
            comment: "Medication",
          }),
        ],
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
      await transaction.taskNotification.create({
        data: { taskId: task.id, userId: user.id },
      });
      const query = new ListCurrentUserNotificationsQuery(
        transaction as PrismaService,
      );

      await expect(query.handle(user.id, false, 0, 10)).resolves.toEqual({
        data: [],
        total: 0,
        skip: 0,
        limit: 10,
      });
    });
  });

  it("returns treatment notifications in the same feed", async () => {
    await runInTestTransaction(async (transaction) => {
      const user = await transaction.user.create({ data: { email: `${Date.now()}-treatment-user@example.com` } });
      const cat = await transaction.cat.create({ data: { name: `Treatment cat ${Date.now()}` } });
      const treatment = await transaction.catTreatment.create({
        data: {
          catId: cat.id,
          createdByUserId: user.id,
          updatedByUserId: user.id,
          shortName: "Antibiotics",
          startDate: new Date("2020-01-01T00:00:00.000Z"),
          dosesPerDay: 1,
        },
      });
      await transaction.taskNotification.create({ data: { treatmentId: treatment.id, userId: user.id } });
      const query = new ListCurrentUserNotificationsQuery(transaction as PrismaService);

      await expect(query.handle(user.id, false, 0, 10)).resolves.toMatchObject({
        data: [expect.objectContaining({ type: "treatment", treatmentId: treatment.id, comment: "Antibiotics", catId: cat.id, catName: cat.name, catNameNumber: cat.nameNumber })],
        total: 1,
      });
    });
  });
});
