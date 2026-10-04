import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { UpdateLocationHandler } from "./update-location.handler";

describe("UpdateLocationHandler", () => {
  it("updates fields, normalizes blank nullable values, and audits each changed field as scalar values", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      const owner = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-owner@example.com`,
          fullName: "Owner",
        },
      });
      const location = await tx.location.create({
        data: {
          name: `Before ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          description: "Old",
          ownerId: null,
        },
      });
      const result = await new UpdateLocationHandler(
        tx as PrismaService,
      ).handle(
        location.id,
        {
          name: "  After  ",
          description: "  New  ",
          ownerId: owner.id,
          status: "INACTIVE",
        },
        false,
        actor.id,
      );
      expect(result).toEqual({ id: location.id });
      await expect(
        tx.location.findUniqueOrThrow({ where: { id: location.id } }),
      ).resolves.toMatchObject({
        name: "After",
        description: "New",
        ownerId: owner.id,
        status: "INACTIVE",
        version: 1,
      });
      await expect(
        tx.user.findUniqueOrThrow({ where: { id: owner.id } }),
      ).resolves.toMatchObject({ version: 1 });
      const events = await tx.locationAuditEvent.findMany({
        where: { locationId: location.id },
      });
      expect(events).toHaveLength(4);
      expect(
        events.every(
          (event) => event.oldValue !== null && event.newValue !== null,
        ),
      ).toBe(true);
      expect(events.map((event) => event.action).sort()).toEqual([
        "description_changed",
        "name_changed",
        "owner_changed",
        "status_changed",
      ]);
      expect(
        events.find((event) => event.action === "owner_changed")?.relatedUserId,
      ).toBe(owner.id);
    });
  });

  it("rejects a blank name", async () => {
    await runInTestTransaction(async (tx) => {
      const target = await tx.location.create({
        data: {
          name: `Target ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await expect(
        new UpdateLocationHandler(tx as PrismaService).handle(
          target.id,
          { name: " " },
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("rejects an invalid status", async () => {
    await runInTestTransaction(async (tx) => {
      const target = await tx.location.create({
        data: {
          name: `Target ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await expect(
        new UpdateLocationHandler(tx as PrismaService).handle(
          target.id,
          { status: "NOPE" },
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("rejects a missing owner", async () => {
    await runInTestTransaction(async (tx) => {
      const target = await tx.location.create({
        data: {
          name: `Target ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await expect(
        new UpdateLocationHandler(tx as PrismaService).handle(
          target.id,
          { ownerId: "missing" },
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it("rejects a duplicate active name", async () => {
    await runInTestTransaction(async (tx) => {
      const existing = await tx.location.create({
        data: {
          name: `Taken ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      const target = await tx.location.create({
        data: {
          name: `Target ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await expect(
        new UpdateLocationHandler(tx as PrismaService).handle(
          target.id,
          { name: existing.name },
          false,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  it("allows a name used only in the other test partition", async () => {
    await runInTestTransaction(async (tx) => {
      const name = `Partitioned ${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await tx.location.create({ data: { name, isTest: false } });
      const target = await tx.location.create({
        data: {
          name: `Target ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          isTest: true,
        },
      });
      await expect(
        new UpdateLocationHandler(tx as PrismaService).handle(
          target.id,
          { name },
          true,
        ),
      ).resolves.toEqual({ id: target.id });
    });
  });

  it("hides locations outside the current partition", async () => {
    await runInTestTransaction(async (tx) => {
      const target = await tx.location.create({
        data: {
          name: `Test ${Date.now()}-${Math.random().toString(36).slice(2)}`,
          isTest: true,
        },
      });
      await expect(
        new UpdateLocationHandler(tx as PrismaService).handle(
          target.id,
          {},
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it("does not write an audit event for a no-op update", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      const location = await tx.location.create({
        data: {
          name: `Stable ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await new UpdateLocationHandler(tx as PrismaService).handle(
        location.id,
        { name: location.name },
        false,
        actor.id,
      );
      await expect(
        tx.locationAuditEvent.count({ where: { locationId: location.id } }),
      ).resolves.toBe(0);
    });
  });
});
