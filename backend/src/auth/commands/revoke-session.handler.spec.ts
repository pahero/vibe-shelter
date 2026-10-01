import { PrismaService } from "../../database/prisma.service";
import { runInTestTransaction } from "../../test-utils/test-db";
import { RevokeSessionHandler } from "./revoke-session.handler";

describe("RevokeSessionHandler", () => {
  it("sets a revocation timestamp", async () => {
    await runInTestTransaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}@example.com`,
        },
      });
      const session = await tx.session.create({
        data: {
          userId: user.id,
          sessionTokenHash: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-token`,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      await new RevokeSessionHandler(tx as PrismaService).handle(session.id);
      await expect(
        tx.session.findUniqueOrThrow({ where: { id: session.id } }),
      ).resolves.toMatchObject({ revokedAt: expect.any(Date) });
    });
  });
});
