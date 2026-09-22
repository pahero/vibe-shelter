import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { UpdateCatTaskHandler } from "./update-cat-task.handler";

describe("UpdateCatTaskHandler", () => {
  it("rejects a missing task", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({
        data: { email: `${Date.now()}-actor@example.com` },
      });
      const handler = new UpdateCatTaskHandler(transaction as PrismaService);
      await expect(
        handler.handle("missing", { comment: "After" }, actor.id, false),
      ).rejects.toThrow("Task not found");
    });
  });

  it("rejects missing replacement receivers", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({
        data: { email: `${Date.now()}-actor@example.com` },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const task = await transaction.catTask.create({
        data: { catId: cat.id, comment: "Before", dueDate: new Date() },
      });
      const handler = new UpdateCatTaskHandler(transaction as PrismaService);
      await expect(
        handler.handle(task.id, { receiverIds: ["missing"] }, actor.id, false),
      ).rejects.toThrow("notification receivers");
    });
  });

  it("replaces receivers and invalidates notifications", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({
        data: { email: `${Date.now()}-actor@example.com` },
      });
      const receiver = await transaction.user.create({
        data: { email: `${Date.now()}-receiver@example.com` },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const task = await transaction.catTask.create({
        data: { catId: cat.id, comment: "Before", dueDate: new Date() },
      });
      await transaction.taskNotification.create({ data: { taskId: task.id, userId: actor.id } });
      const handler = new UpdateCatTaskHandler(transaction as PrismaService);
      await expect(
        handler.handle(task.id, { receiverIds: [receiver.id] }, actor.id, false),
      ).resolves.toEqual({ id: task.id });
      await expect(
        transaction.catTaskReceiver.findUniqueOrThrow({
          where: { taskId_userId: { taskId: task.id, userId: receiver.id } },
        }),
      ).resolves.toBeDefined();
      await expect(
        transaction.taskNotification.count({ where: { taskId: task.id } }),
      ).resolves.toBe(0);
    });
  });

  it("updates a task and audits the action", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({
        data: { email: `${Date.now()}-actor@example.com` },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const task = await transaction.catTask.create({
        data: { catId: cat.id, comment: "Before", dueDate: new Date() },
      });
      const handler = new UpdateCatTaskHandler(transaction as PrismaService);

      await expect(handler.handle(task.id, { comment: "After" }, actor.id, false)).resolves.toEqual(
        { id: task.id },
      );
      await expect(
        transaction.catTask.findUniqueOrThrow({ where: { id: task.id } }),
      ).resolves.toMatchObject({ comment: "After" });
      await expect(
        transaction.catAuditEvent.findFirstOrThrow({
          where: { catId: cat.id, eventType: "task_comment_changed" },
        }),
      ).resolves.toMatchObject({ actorUserId: actor.id });
    });
  });
});
