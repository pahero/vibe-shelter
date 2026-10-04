import { ConflictException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CreateArchivingReasonCommand } from "./create-archiving-reason.command";

describe("CreateArchivingReasonCommand", () => {
  it("creates and audits an archiving reason", async () => {
    await runInTestTransaction(async (tx) => {
      const command = new CreateArchivingReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random()}@example.com`,
          status: "ACTIVE",
        },
      });
      const name = `Adopted in CY ${Date.now()}-${Math.random()}`;
      const reason = await command.execute(name, actor.id, false);

      expect(reason).toEqual({ id: expect.any(String) });
      await expect(
        tx.auditEvent.findFirstOrThrow({
          where: { archivingReasonId: reason.id },
        }),
      ).resolves.toMatchObject({
        eventType: "archiving_reason_create",
        actorUserId: actor.id,
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects an active duplicate name", async () => {
    await runInTestTransaction(async (tx) => {
      const command = new CreateArchivingReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random()}@example.com`,
          status: "ACTIVE",
        },
      });
      const name = `Duplicate reason ${Date.now()}-${Math.random()}`;
      await tx.catArchivingReason.create({ data: { name } });

      await expect(command.execute(name, actor.id, false)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  it("allows the same active name in the other test partition", async () => {
    await runInTestTransaction(async (tx) => {
      const command = new CreateArchivingReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random()}@example.com`,
          status: "ACTIVE",
        },
      });
      const name = `Partitioned reason ${Date.now()}-${Math.random()}`;
      await tx.catArchivingReason.create({ data: { name, isTest: false } });

      await expect(
        command.execute(name, actor.id, true),
      ).resolves.toMatchObject({
        id: expect.any(String),
      });
    });
  });

  it("allows reusing a soft-deleted reason name", async () => {
    await runInTestTransaction(async (tx) => {
      const command = new CreateArchivingReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random()}@example.com`,
          status: "ACTIVE",
        },
      });
      const name = `Reusable reason ${Date.now()}-${Math.random()}`;
      await tx.catArchivingReason.create({
        data: { name, deletedAt: new Date() },
      });

      await expect(
        command.execute(name, actor.id, false),
      ).resolves.toMatchObject({
        id: expect.any(String),
      });
    });
  });
});
