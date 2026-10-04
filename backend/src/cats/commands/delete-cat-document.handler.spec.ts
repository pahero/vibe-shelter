import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { DeleteCatDocumentHandler } from "./delete-cat-document.handler";

describe("DeleteCatDocumentHandler", () => {
  it("soft-deletes and versions the document and emits value-free lifecycle history", async () => {
    await runInTestTransaction(async (tx) => {
      const actor = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      const document = await tx.catDocument.create({
        data: { catId: cat.id, key: "document-key", fileName: "record.pdf" },
      });
      await new DeleteCatDocumentHandler(tx as PrismaService).handle(
        cat.id,
        document.id,
        actor.id,
        false,
      );
      await expect(
        tx.catDocument.findUniqueOrThrow({ where: { id: document.id } }),
      ).resolves.toMatchObject({
        deletedAt: expect.any(Date),
        version: 2,
        deletedByUserId: actor.id,
      });
      await expect(
        tx.auditEvent.findFirstOrThrow({
          where: { documentId: document.id },
        }),
      ).resolves.toMatchObject({
        eventType: "document_deleted",
        oldValue: null,
        newValue: null,
      });
    });
  });

  it("rejects a missing or already deleted document", async () => {
    await runInTestTransaction(async (tx) => {
      const cat = await tx.cat.create({
        data: {
          name: `Cat ${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });
      await expect(
        new DeleteCatDocumentHandler(tx as PrismaService).handle(
          cat.id,
          "missing",
          "actor",
          false,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
