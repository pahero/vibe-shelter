import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ReopenCatTaskHandler } from "./reopen-cat-task.handler";

describe("ReopenCatTaskHandler", () => {
  it("reopens a receiver's completed task and audits it", async () => {
    await runInTestTransaction(async (db) => {
      const user = await db.user.create({
        data: {
          fullName: "Receiver",
          email: `${crypto.randomUUID()}@example.com`,
        },
      });
      const cat = await db.cat.create({
        data: {
          name: "Cat",
          currentLocation: { create: { name: "Location" } },
        },
      });
      const task = await db.catTask.create({
        data: {
          catId: cat.id,
          comment: "Reminder",
          dueDate: new Date(),
          completedAt: new Date(),
          completedByUserId: user.id,
          notificationSentAt: new Date(),
          receivers: { create: { userId: user.id } },
        },
      });
      const handler = new ReopenCatTaskHandler(db as PrismaService);
      expect(await handler.handle(task.id, user.id, false)).toEqual({
        id: task.id,
      });
      const updated = await db.catTask.findUniqueOrThrow({
        where: { id: task.id },
      });
      expect(updated).toMatchObject({
        completedAt: null,
        completedByUserId: null,
        notificationSentAt: null,
      });
      expect(updated.concurrencyToken).not.toBe(task.concurrencyToken);
      expect(
        await db.auditEvent.findFirstOrThrow({
          where: { taskId: task.id, eventType: "task_reopened" },
        }),
      ).toMatchObject({
        catId: cat.id,
        actorUserId: user.id,
        oldValue: "completed",
        newValue: "not completed",
      });
    });
  });

  it.each([
    "missing",
    "partition",
    "deleted",
    "deleted cat",
    "no receiver",
    "removed receiver",
    "active",
  ])("rejects %s", async (scenario) => {
    await runInTestTransaction(async (db) => {
      const user = await db.user.create({
        data: { fullName: "User", email: `${crypto.randomUUID()}@example.com` },
      });
      const cat = await db.cat.create({
        data: {
          name: "Cat",
          isTest: scenario === "partition",
          deletedAt: scenario === "deleted cat" ? new Date() : null,
          currentLocation: { create: { name: "Location" } },
        },
      });
      const task = await db.catTask.create({
        data: {
          catId: cat.id,
          comment: "Task",
          dueDate: new Date(),
          completedAt: scenario === "active" ? null : new Date(),
          deletedAt: scenario === "deleted" ? new Date() : null,
        },
      });
      if (scenario !== "no receiver")
        await db.catTaskReceiver.create({
          data: {
            taskId: task.id,
            userId: user.id,
            deletedAt: scenario === "removed receiver" ? new Date() : null,
          },
        });
      const handler = new ReopenCatTaskHandler(db as PrismaService);
      await expect(
        handler.handle(
          scenario === "missing" ? "missing" : task.id,
          user.id,
          false,
        ),
      ).rejects.toThrow(
        scenario === "active"
          ? "Task is not completed"
          : scenario === "no receiver" || scenario === "removed receiver"
            ? "Task receiver not found"
            : "Task not found",
      );
    });
  });
});
