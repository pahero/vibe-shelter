import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { CatPhotoUrlService } from "../cat-photo-url.service";
import { PermanentlyDeleteCatsHandler } from "./permanently-delete-cats.handler";

describe("PermanentlyDeleteCatsHandler", () => {
  const photoUrls = { deletePhoto: async () => undefined } as unknown as CatPhotoUrlService;

  it("rejects empty ID lists", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new PermanentlyDeleteCatsHandler(tx as PrismaService, photoUrls).handle([" "])).rejects.toThrow(BadRequestException);
    });
  });

  it("rejects batches larger than 100", async () => {
    await runInTestTransaction(async (tx) => {
      await expect(new PermanentlyDeleteCatsHandler(tx as PrismaService, photoUrls).handle(Array.from({ length: 101 }, (_, index) => `id-${index}`))).rejects.toThrow(BadRequestException);
    });
  });

  it("does not partially delete when any ID is missing", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Purge ${crypto.randomUUID()}`, currentLocation: { create: { name: `Purge location ${crypto.randomUUID()}` } } } });
      const handler = new PermanentlyDeleteCatsHandler(tx as PrismaService, photoUrls);
      await expect(handler.handle([cat.id, "missing-cat-id"])).rejects.toThrow(NotFoundException);
      await expect(tx.cat.findUnique({ where: { id: cat.id } })).resolves.not.toBeNull();
    });
  });

  it("permanently deletes cats and their restrictive flight assignments", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({ data: { name: `Purge ${crypto.randomUUID()}`, currentLocation: { create: { name: `Purge location ${crypto.randomUUID()}` } } } });
      const flight = await tx.flight.create({ data: { date: new Date(), airport: "LCA", flightNumber: "TEST", flightParent: "Test flight" } });
      const assignment = await tx.flightCatAssignment.create({ data: { catId: cat.id, flightId: flight.id } });
      const handler = new PermanentlyDeleteCatsHandler(tx as PrismaService, photoUrls);
      await expect(handler.handle([cat.id, cat.id])).resolves.toEqual({ deletedCount: 1 });
      await expect(tx.cat.findUnique({ where: { id: cat.id } })).resolves.toBeNull();
      await expect(tx.flightCatAssignment.findUnique({ where: { id: assignment.id } })).resolves.toBeNull();
      await tx.flight.delete({ where: { id: flight.id } });
    });
  });
});
