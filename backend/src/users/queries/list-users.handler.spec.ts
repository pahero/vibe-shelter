import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListUsersHandler } from "./list-users.handler";

describe("ListUsersHandler", () => {
  it("maps user records and filters by test marker, role, status, excluding deleted accounts", async () => {
    await runInTestTransaction(async (tx) => {
      const marker = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()}`;
      const matching = await tx.user.create({
        data: {
          email: `${marker}@example.com`,
          role: "ADMIN",
          status: "ACTIVE",
          isTest: true,
        },
      });
      await tx.user.create({
        data: {
          email: `${marker}-other@example.com`,
          role: "STAFF",
          status: "ACTIVE",
          isTest: true,
        },
      });
      await tx.user.create({
        data: {
          email: `${marker}-deleted@example.com`,
          role: "ADMIN",
          status: "ACTIVE",
          isTest: true,
          deletedAt: new Date(),
        },
      });
      const result = await new ListUsersHandler(tx as PrismaService).handle({
        role: "admin",
        status: "active",
        isTest: true,
      });
      expect(result).toEqual([
        expect.objectContaining({
          id: matching.id,
          role: "admin",
          status: "active",
          isTest: true,
        }),
      ]);
    });
  });

  it("rejects an invalid status filter", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new ListUsersHandler(tx as PrismaService).handle({ status: "unknown" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("rejects an invalid role filter", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(
        new ListUsersHandler(tx as PrismaService).handle({ role: "owner" }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
