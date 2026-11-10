import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListReminderReceiversHandler } from "./list-reminder-receivers.handler";

describe("ListReminderReceiversHandler", () => {
  it("filters active, undeleted users by current partition and sorts by full name", async () => {
    await runInTestTransaction(async (db) => {
      const zed = await db.user.create({
        data: {
          fullName: "Zed",
          email: `${crypto.randomUUID()}@example.com`,
          isTest: true,
        },
      });
      const amy = await db.user.create({
        data: {
          fullName: "Amy",
          email: `${crypto.randomUUID()}@example.com`,
          isTest: true,
        },
      });
      await db.user.create({
        data: {
          fullName: "Production",
          email: `${crypto.randomUUID()}@example.com`,
          isTest: false,
        },
      });
      await db.user.create({
        data: {
          fullName: "Inactive",
          email: `${crypto.randomUUID()}@example.com`,
          isTest: true,
          status: "INACTIVE",
        },
      });
      await db.user.create({
        data: {
          fullName: "Deleted",
          email: `${crypto.randomUUID()}@example.com`,
          isTest: true,
          deletedAt: new Date(),
        },
      });
      const result = await new ListReminderReceiversHandler(
        db as PrismaService,
      ).handle(true);
      const matching = result.filter((user) =>
        [amy.id, zed.id].includes(user.id),
      );
      expect(matching.map((user) => user.id)).toEqual([amy.id, zed.id]);
      expect(matching.map((user) => user.fullName)).toEqual(["Amy", "Zed"]);
    });
  });
});
