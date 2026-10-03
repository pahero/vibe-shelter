import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { UpdateCatNameNumberHandler } from "./update-cat-name-number.handler";

describe("UpdateCatNameNumberHandler", () => {
  it("updates a cat number", async () => {
    await runInTestTransaction(async (tx) => {
      const name = uniqueName();
      const cat = await tx.cat.create({ data: { name } });
      const actorUserId = await createActor(tx);
      await expect(
        new UpdateCatNameNumberHandler(tx as PrismaService).handle(
          cat.id,
          4,
          false,
          actorUserId,
        ),
      ).resolves.toEqual({ id: cat.id });
      await expect(
        tx.cat.findUniqueOrThrow({ where: { id: cat.id } }),
      ).resolves.toMatchObject({ nameNumber: 4 });
    });
  });

  it("rejects numbers already used in the same partition", async () => {
    await runInTestTransaction(async (tx) => {
      const name = uniqueName();
      await tx.cat.create({ data: { name, nameNumber: 1 } });
      const target = await tx.cat.create({ data: { name, nameNumber: 2 } });
      const actorUserId = await createActor(tx);
      await expect(
        new UpdateCatNameNumberHandler(tx as PrismaService).handle(
          target.id,
          1,
          false,
          actorUserId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  it("allows the same number in the other partition", async () => {
    await runInTestTransaction(async (tx) => {
      const name = uniqueName();
      await tx.cat.create({ data: { name, nameNumber: 1, isTest: false } });
      const target = await tx.cat.create({
        data: { name, nameNumber: 2, isTest: true },
      });
      const actorUserId = await createActor(tx);
      await expect(
        new UpdateCatNameNumberHandler(tx as PrismaService).handle(
          target.id,
          1,
          true,
          actorUserId,
        ),
      ).resolves.toEqual({ id: target.id });
    });
  });

  it("does not reveal cats from another partition", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: { name: uniqueName(), isTest: true },
      });
      const actorUserId = await createActor(tx);
      await expect(
        new UpdateCatNameNumberHandler(tx as PrismaService).handle(
          cat.id,
          2,
          false,
          actorUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

function uniqueName(): string {
  return `Numbered ${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function createActor(tx: Prisma.TransactionClient): Promise<string> {
  const user = await tx.user.create({
    data: { email: `${uniqueName()}@example.com` },
  });
  return user.id;
}
