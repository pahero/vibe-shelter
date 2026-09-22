import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { DeleteCatTaskHandler } from "./delete-cat-task.handler";

describe("DeleteCatTaskHandler", () => {
  it("rejects a missing task", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({
        data: { email: `${Date.now()}-actor@example.com` },
      });
      const handler = new DeleteCatTaskHandler(transaction as PrismaService);
      await expect(handler.handle("missing", actor.id, false)).rejects.toThrow("Task not found");
    });
  });

  it("soft deletes a task, changes its token, and audits the action", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({
        data: { email: `${Date.now()}-actor@example.com` },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const task = await transaction.catTask.create({
        data: { catId: cat.id, comment: "Delete", dueDate: new Date() },
      });
      const handler = new DeleteCatTaskHandler(transaction as PrismaService);

      await handler.handle(task.id, actor.id, false);

      await expect(
        transaction.catTask.findUniqueOrThrow({ where: { id: task.id } }),
      ).resolves.toMatchObject({ deletedAt: expect.any(Date) });
      await expect(
        transaction.catAuditEvent.findFirstOrThrow({
          where: { catId: cat.id, eventType: "task_deleted" },
        }),
      ).resolves.toMatchObject({ actorUserId: actor.id });
    });
  });
});
