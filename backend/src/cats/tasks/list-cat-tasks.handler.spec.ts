import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListCatTasksHandler } from "./list-cat-tasks.handler";

describe("ListCatTasksHandler", () => {
  it("rejects a missing cat", async () => {
    await runInTestTransaction(async (transaction) => {
      const handler = new ListCatTasksHandler(transaction as PrismaService);
      await expect(handler.handle("missing", false)).rejects.toThrow("Cat not found");
    });
  });

  it("returns active tasks with their receivers and completion details", async () => {
    await runInTestTransaction(async (transaction) => {
      const receiver = await transaction.user.create({
        data: { email: `${Date.now()}-receiver@example.com`, fullName: "Receiver" },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const activeTask = await transaction.catTask.create({
        data: { catId: cat.id, comment: "Active", dueDate: new Date() },
      });
      await transaction.catTaskReceiver.create({
        data: { taskId: activeTask.id, userId: receiver.id },
      });
      const completedTask = await transaction.catTask.create({
        data: {
          catId: cat.id,
          comment: "Completed",
          dueDate: new Date(),
          completedAt: new Date(),
          completedByUserId: receiver.id,
        },
      });
      await transaction.catTask.create({
        data: { catId: cat.id, comment: "Deleted", dueDate: new Date(), deletedAt: new Date() },
      });
      const handler = new ListCatTasksHandler(transaction as PrismaService);

      await expect(handler.handle(cat.id, false)).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: activeTask.id,
            receiverIds: [receiver.id],
            completedBy: null,
          }),
          expect.objectContaining({
            id: completedTask.id,
            completedAt: expect.any(String),
            completedBy: { id: receiver.id, fullName: "Receiver" },
          }),
        ]),
      );
    });
  });
});
