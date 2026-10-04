import { ConflictException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { UpdateArchivationReasonCommand } from "./update-archivation-reason.command";

describe("UpdateArchivationReasonCommand", () => {
  it("updates and audits an active archivation reason", async () => {
    await runInTestTransaction(async (tx) => {
      const command = new UpdateArchivationReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random()}@example.com`,
          status: "ACTIVE",
        },
      });
      const reason = await tx.catArchivationReason.create({
        data: { name: `Before ${Date.now()}-${Math.random()}` },
      });
      const name = `Adopted in GB ${Date.now()}-${Math.random()}`;
      const updated = await command.execute(reason.id, name, actor.id, false);

      expect(updated).toEqual({ id: reason.id });
      await expect(
        tx.catAuditEvent.findFirstOrThrow({
          where: { archivationReasonId: reason.id },
        }),
      ).resolves.toMatchObject({
        eventType: "archivation_reason_update",
        actorUserId: actor.id,
        oldValue: reason.name,
        newValue: name,
      });
    });
  });

  it("allows updating to a name used only by a reason in the other partition", async () => {
    await runInTestTransaction(async (tx) => {
      const command = new UpdateArchivationReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random()}@example.com`,
          status: "ACTIVE",
        },
      });
      const name = `Shared reason ${Date.now()}-${Math.random()}`;
      await tx.catArchivationReason.create({ data: { name, isTest: false } });
      const target = await tx.catArchivationReason.create({
        data: { name: `Target ${Date.now()}-${Math.random()}`, isTest: true },
      });

      await expect(
        command.execute(target.id, name, actor.id, true),
      ).resolves.toEqual({ id: target.id });
    });
  });

  it("rejects updating to an active name already used in its partition", async () => {
    await runInTestTransaction(async (tx) => {
      const command = new UpdateArchivationReasonCommand(tx as PrismaService);
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random()}@example.com`,
          status: "ACTIVE",
        },
      });
      const existing = await tx.catArchivationReason.create({
        data: { name: `Existing ${Date.now()}-${Math.random()}` },
      });
      const target = await tx.catArchivationReason.create({
        data: { name: `Target ${Date.now()}-${Math.random()}` },
      });

      await expect(
        command.execute(target.id, existing.name, actor.id, false),
      ).rejects.toThrow(ConflictException);
    });
  });
});
