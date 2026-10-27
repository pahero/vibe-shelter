import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListFavoriteCatsWithActiveTreatmentsHandler } from "./list-favorite-cats-with-active-treatments.handler";

describe("ListFavoriteCatsWithActiveTreatmentsHandler", () => {
  it("returns only the user's favorite cats with active treatments in updated order", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const now = new Date();
      const currentDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const active = await tx.cat.create({ data: { name: `Fav ${crypto.randomUUID()}` } });
      const noTreatment = await tx.cat.create({ data: { name: `Empty ${crypto.randomUUID()}` } });
      const inactiveTreatment = await tx.cat.create({ data: { name: `Old ${crypto.randomUUID()}` } });
      await tx.catFavorite.createMany({ data: [{ userId: user.id, catId: active.id }, { userId: user.id, catId: noTreatment.id }, { userId: user.id, catId: inactiveTreatment.id }] });
      await tx.catTreatment.createMany({ data: [
        { catId: active.id, shortName: "Current", startDate: currentDate, dosesPerDay: 1 },
        { catId: inactiveTreatment.id, shortName: "Finished", startDate: new Date("2020-01-01"), endDate: new Date("2020-01-02"), dosesPerDay: 1 },
      ] });
      const result = await new ListFavoriteCatsWithActiveTreatmentsHandler(tx as PrismaService).handle(user.id, false);
      expect(result).toMatchObject([{ id: active.id, name: active.name, nameNumber: active.nameNumber }]);
      expect(result).toHaveLength(1);
    });
  });

  it("partitions by current user and omits deleted cats", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const otherUser = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const currentDate = new Date();
      const cats = await Promise.all([
        tx.cat.create({ data: { name: `Regular ${crypto.randomUUID()}` } }),
        tx.cat.create({ data: { name: `Other user ${crypto.randomUUID()}` } }),
        tx.cat.create({ data: { name: `Test ${crypto.randomUUID()}`, isTest: true } }),
        tx.cat.create({ data: { name: `Deleted ${crypto.randomUUID()}`, deletedAt: new Date() } }),
      ]);
      await tx.catFavorite.createMany({ data: [
        { userId: user.id, catId: cats[0].id }, { userId: otherUser.id, catId: cats[1].id },
        { userId: user.id, catId: cats[2].id }, { userId: user.id, catId: cats[3].id },
      ] });
      await tx.catTreatment.createMany({ data: cats.map((cat) => ({ catId: cat.id, shortName: "Current", startDate: currentDate, dosesPerDay: 1 })) });
      const handler = new ListFavoriteCatsWithActiveTreatmentsHandler(tx as PrismaService);
      const regular = await handler.handle(user.id, false);
      expect(regular.map((cat) => cat.id)).toEqual([cats[0].id]);
    });
  });

  it("partitions test cats by the user's test environment", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${crypto.randomUUID()}@example.com` } });
      const cat = await tx.cat.create({ data: { name: `Test ${crypto.randomUUID()}`, isTest: true } });
      await tx.catFavorite.create({ data: { userId: user.id, catId: cat.id } });
      await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Current", startDate: new Date(), dosesPerDay: 1 } });
      const result = await new ListFavoriteCatsWithActiveTreatmentsHandler(tx as PrismaService).handle(user.id, true);
      expect(result.map((item) => item.id)).toEqual([cat.id]);
    });
  });
});
