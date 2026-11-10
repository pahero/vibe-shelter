import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListMyTasksHandler } from "./list-my-tasks.handler";

describe("ListMyTasksHandler", () => {
  it("returns active reminders, including completed ones, assigned to the user in their partition", async () => {
    await runInTestTransaction(async (db) => {
      const user = await db.user.create({
        data: {
          email: `${crypto.randomUUID()}@example.com`,
          fullName: "Receiver",
        },
      });
      const other = await db.user.create({
        data: {
          email: `${crypto.randomUUID()}@example.com`,
          fullName: "Other",
        },
      });
      const location = await db.location.create({ data: { name: "Location" } });
      const cat = await db.cat.create({
        data: { name: "Dashboard cat", currentLocationId: location.id },
      });
      const testCat = await db.cat.create({
        data: {
          name: "Test cat",
          isTest: true,
          currentLocationId: location.id,
        },
      });
      const deletedCat = await db.cat.create({
        data: {
          name: "Deleted cat",
          deletedAt: new Date(),
          currentLocationId: location.id,
        },
      });
      const create = (
        catId: string,
        comment: string,
        receiverId: string,
        options: {
          deletedAt?: Date;
          completedAt?: Date;
          receiverDeleted?: boolean;
        } = {},
      ) =>
        db.catTask.create({
          data: {
            catId,
            comment,
            dueDate: new Date("2025-01-01"),
            deletedAt: options.deletedAt,
            completedAt: options.completedAt,
            receivers: {
              create: {
                userId: receiverId,
                deletedAt: options.receiverDeleted ? new Date() : null,
              },
            },
          },
        });
      const task = await create(cat.id, "Assigned", user.id);
      await create(cat.id, "Other", other.id);
      const completed = await create(cat.id, "Completed", user.id, {
        completedAt: new Date(),
      });
      await create(cat.id, "Deleted", user.id, { deletedAt: new Date() });
      await create(cat.id, "Unassigned", user.id, { receiverDeleted: true });
      await create(testCat.id, "Other partition", user.id);
      await create(deletedCat.id, "Deleted cat", user.id);
      const handler = new ListMyTasksHandler(db as PrismaService);
      const result = await handler.handle(user.id, false);
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          {
            id: task.id,
            catId: cat.id,
            comment: "Assigned",
            dueDate: task.dueDate,
            completedAt: null,
            completedBy: null,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            receiverIds: [user.id],
            cat: { id: cat.id, name: cat.name, nameNumber: cat.nameNumber },
          },
          {
            id: completed.id,
            catId: cat.id,
            comment: "Completed",
            dueDate: completed.dueDate,
            completedAt: completed.completedAt,
            completedBy: null,
            createdAt: completed.createdAt,
            updatedAt: completed.updatedAt,
            receiverIds: [user.id],
            cat: { id: cat.id, name: cat.name, nameNumber: cat.nameNumber },
          },
        ]),
      );
    });
  });
});
