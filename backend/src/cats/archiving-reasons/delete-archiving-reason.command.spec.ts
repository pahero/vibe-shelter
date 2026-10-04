import { ConflictException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { DeleteArchivingReasonCommand } from "./delete-archiving-reason.command";

describe("DeleteArchivingReasonCommand", () => {
  it("soft deletes and audits an unused archiving reason", async () => {
    await runInTestTransaction(async (tx) => {
      const command = new DeleteArchivingReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random()}@example.com`,
          status: "ACTIVE",
        },
      });
      const reason = await tx.catArchivingReason.create({
        data: { name: `Unused ${Date.now()}-${Math.random()}` },
      });
      await command.execute(reason.id, actor.id);

      await expect(
        tx.catArchivingReason.findUniqueOrThrow({ where: { id: reason.id } }),
      ).resolves.toMatchObject({ deletedAt: expect.any(Date) });
      await expect(
        tx.auditEvent.findFirstOrThrow({
          where: { archivingReasonId: reason.id },
        }),
      ).resolves.toMatchObject({
        eventType: "archiving_reason_delete",
        actorUserId: actor.id,
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("reassigns cats to a replacement reason before deleting", async () => {
    await runInTestTransaction(async (tx) => {
      const command = new DeleteArchivingReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random()}@example.com`,
          status: "ACTIVE",
        },
      });
      const reason = await tx.catArchivingReason.create({
        data: { name: `Used ${Date.now()}-${Math.random()}` },
      });
      const replacement = await tx.catArchivingReason.create({
        data: { name: `Replacement ${Date.now()}-${Math.random()}` },
      });
      const cat = await tx.cat.create({
        data: {
          name: `Archived ${Date.now()}-${Math.random()}`,
          archivingReasonId: reason.id,
        },
      });

      await command.execute(reason.id, actor.id, replacement.id);
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: cat.id } }),
      ).resolves.toMatchObject({ archivingReasonId: replacement.id });
      await expect(
        tx.catArchivingReason.findUniqueOrThrow({ where: { id: reason.id } }),
      ).resolves.toMatchObject({ deletedAt: expect.any(Date) });
    });
  });

  it("requires a replacement reason when cats are assigned", async () => {
    await runInTestTransaction(async (tx) => {
      const command = new DeleteArchivingReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random()}@example.com`,
          status: "ACTIVE",
        },
      });
      const reason = await tx.catArchivingReason.create({
        data: { name: `Used ${Date.now()}-${Math.random()}` },
      });
      await tx.cat.create({
        data: {
          name: `Archived ${Date.now()}-${Math.random()}`,
          archivingReasonId: reason.id,
        },
      });

      await expect(command.execute(reason.id, actor.id)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
