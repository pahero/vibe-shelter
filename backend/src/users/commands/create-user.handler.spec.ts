import { BadRequestException, ConflictException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CreateUserHandler } from "./create-user.handler";

describe("CreateUserHandler", () => {
  it("creates a normalized user and hashes the password", async () => {
    await runInTestTransaction(async (tx) => {
      const result = await new CreateUserHandler(tx as PrismaService).handle({
        email: "test-user@example.com",
        fullName: "User",
        role: "staff",
        status: "active",
        password: "Password123!",
        isTest: true,
      });
      const user = await tx.user.findUniqueOrThrow({
        where: { id: result.id },
      });
      expect(user).toMatchObject({
        email: "test-user@example.com",
        fullName: "User",
        role: "STAFF",
        status: "ACTIVE",
        isTest: true,
        passwordChangeRequired: true,
      });
      expect(await bcrypt.compare("Password123!", user.passwordHash!)).toBe(
        true,
      );
    });
  });

  it("rejects a blank password before persistence", async () => {
    await runInTestTransaction(async (tx) => {
      const email = `${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
      await expect(
        new CreateUserHandler(tx as PrismaService).handle({
          email,
          role: "staff",
          status: "active",
          password: "  ",
          isTest: false,
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(tx.user.count({ where: { email } })).resolves.toBe(0);
    });
  });

  it("requires the test-user marker", async () => {
    await runInTestTransaction(async (tx) => {
      const command = {
        email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        role: "staff",
        status: "active",
        password: "Password123!",
      };
      await expect(
        new CreateUserHandler(tx as PrismaService).handle(
          command as Parameters<CreateUserHandler["handle"]>[0],
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("rejects an invalid role", async () => {
    await runInTestTransaction(async (tx) => {
      const command = {
        email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        role: "owner",
        status: "active",
        password: "Password123!",
        isTest: false,
      };
      await expect(
        new CreateUserHandler(tx as PrismaService).handle(
          command as Parameters<CreateUserHandler["handle"]>[0],
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("rejects an invalid status", async () => {
    await runInTestTransaction(async (tx) => {
      const command = {
        email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        role: "staff",
        status: "deleted",
        password: "Password123!",
        isTest: false,
      };
      await expect(
        new CreateUserHandler(tx as PrismaService).handle(
          command as Parameters<CreateUserHandler["handle"]>[0],
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("rejects duplicate email addresses case-insensitively", async () => {
    await runInTestTransaction(async (tx) => {
      const email = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`;
      await tx.user.create({ data: { email } });
      await expect(
        new CreateUserHandler(tx as PrismaService).handle({
          email: email.toUpperCase(),
          role: "staff",
          status: "active",
          password: "Password123!",
          isTest: false,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
