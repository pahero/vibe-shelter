import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CreateCatTaskHandler } from "./create-cat-task.handler";

describe("CreateCatTaskHandler", () => {
  it("rejects a missing cat", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({
        data: { email: `${Date.now()}-actor@example.com` },
      });
      const handler = new CreateCatTaskHandler(transaction as PrismaService);
      await expect(
        handler.handle(
          "missing",
          { comment: "Medication", dueDate: new Date(), receiverIds: [actor.id] },
          actor.id,
          false,
        ),
      ).rejects.toThrow("Cat not found");
    });
  });

  it("rejects missing notification receivers", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({
        data: { email: `${Date.now()}-actor@example.com` },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const handler = new CreateCatTaskHandler(transaction as PrismaService);
      await expect(
        handler.handle(
          cat.id,
          { comment: "Medication", dueDate: new Date(), receiverIds: ["missing"] },
          actor.id,
          false,
        ),
      ).rejects.toThrow("notification receivers");
    });
  });

  it("creates receivers, advances the task token, and audits the action", async () => {
    await runInTestTransaction(async (transaction) => {
      const actor = await transaction.user.create({
        data: { email: `${Date.now()}-actor@example.com` },
      });
      const cat = await transaction.cat.create({ data: { name: `Cat ${Date.now()}` } });
      const handler = new CreateCatTaskHandler(transaction as PrismaService);

      const result = await handler.handle(
        cat.id,
        { comment: "Medication", dueDate: new Date(), receiverIds: [actor.id] },
        actor.id,
        false,
      );

      expect(result).toEqual({ id: expect.any(String) });
      await expect(
        transaction.catTask.findUniqueOrThrow({ where: { id: result.id } }),
      ).resolves.toMatchObject({ catId: cat.id, comment: "Medication" });
      await expect(
        transaction.catTaskReceiver.findUniqueOrThrow({
          where: { taskId_userId: { taskId: result.id, userId: actor.id } },
        }),
      ).resolves.toBeDefined();
      await expect(
        transaction.catAuditEvent.findFirstOrThrow({
          where: { catId: cat.id, eventType: "task_created" },
        }),
      ).resolves.toMatchObject({ actorUserId: actor.id });
    });
  });
});
