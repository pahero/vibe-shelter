import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { ListCatTreatmentsHandler } from "./list-cat-treatments.handler";

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("ListCatTreatmentsHandler", () => {
  it("rejects a missing cat", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new ListCatTreatmentsHandler(tx as PrismaService).handle("missing", false)).rejects.toThrow("Cat not found");
    });
  });

  it("returns treatments in creation order with recorded checker details", async () => {
    await runInTestTransaction(async (tx) => {
      const checker = await tx.user.create({ data: { email: `${Date.now()}-list-checker@example.com`, fullName: "Checker" } });
      const cat = await tx.cat.create({ data: { name: "List cat" } });
      const first = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "First", instructions: "Do", startDate: day("2026-09-01"), endDate: null, dosesPerDay: 1 } });
      const second = await tx.catTreatment.create({ data: { catId: cat.id, shortName: "Second", instructions: "Do twice", startDate: day("2026-09-01"), endDate: day("2026-09-02"), dosesPerDay: 2 } });
      await tx.catTreatmentAdministration.create({ data: { treatmentId: second.id, administeredOn: day("2026-09-01"), doseNumber: 2, checkedByUserId: checker.id } });
      await expect(new ListCatTreatmentsHandler(tx as PrismaService).handle(cat.id, false)).resolves.toEqual([
        expect.objectContaining({ id: first.id, shortName: "First", administrations: [] }),
        expect.objectContaining({ id: second.id, endDate: "2026-09-02", administrations: [{ date: "2026-09-01", doseNumber: 2, checkedBy: { id: checker.id, fullName: "Checker" } }] }),
      ]);
    });
  });
});
