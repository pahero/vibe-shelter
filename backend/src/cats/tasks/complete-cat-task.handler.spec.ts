import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CompleteCatTaskHandler } from "./complete-cat-task.handler";

describe("CompleteCatTaskHandler", () => {
  it("rejects a missing task", async () => {
    await runInTestTransaction(async (transaction) => {
      const user = await transaction.user.create({
        data: { email: `${Date.now()}-user@example.com` },
      });
      const handler = new CompleteCatTaskHandler(transaction as PrismaService);
      await expect(handler.handle("missing", user.id, false)).rejects.toThrow("Task not found");
    });
  });

  it("rejects a completed task", async () => {
    await runInTestTransaction(async (transaction) => {
      const user = await transaction.user.create({
        data: { email: `${Date.now()}-user@example.com` },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const task = await transaction.catTask.create({
        data: { catId: cat.id, comment: "Done", dueDate: new Date(), completedAt: new Date() },
      });
      const handler = new CompleteCatTaskHandler(transaction as PrismaService);
      await expect(handler.handle(task.id, user.id, false)).rejects.toThrow("already completed");
    });
  });

  it("rejects a user who is not a receiver", async () => {
    await runInTestTransaction(async (transaction) => {
      const user = await transaction.user.create({
        data: { email: `${Date.now()}-user@example.com` },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const task = await transaction.catTask.create({
        data: { catId: cat.id, comment: "Open", dueDate: new Date() },
      });
      const handler = new CompleteCatTaskHandler(transaction as PrismaService);
      await expect(handler.handle(task.id, user.id, false)).rejects.toThrow(
        "Task receiver not found",
      );
    });
  });

  it("allows a receiver to complete a task and audits the action", async () => {
    await runInTestTransaction(async (transaction) => {
      const receiver = await transaction.user.create({
        data: { email: `${Date.now()}-receiver@example.com` },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const task = await transaction.catTask.create({
        data: { catId: cat.id, comment: "Complete", dueDate: new Date() },
      });
      await transaction.catTaskReceiver.create({ data: { taskId: task.id, userId: receiver.id } });
      await transaction.taskNotification.create({ data: { taskId: task.id, userId: receiver.id } });
      const handler = new CompleteCatTaskHandler(transaction as PrismaService);

      await expect(handler.handle(task.id, receiver.id, false)).resolves.toEqual({ id: task.id });
      await expect(
        transaction.catTask.findUniqueOrThrow({ where: { id: task.id } }),
      ).resolves.toMatchObject({ completedAt: expect.any(Date), completedByUserId: receiver.id });
      await expect(
        transaction.catAuditEvent.findFirstOrThrow({
          where: { catId: cat.id, eventType: "task_completed" },
        }),
      ).resolves.toMatchObject({ actorUserId: receiver.id });
      await expect(
        transaction.taskNotification.count({ where: { taskId: task.id } }),
      ).resolves.toBe(0);
    });
  });
});
