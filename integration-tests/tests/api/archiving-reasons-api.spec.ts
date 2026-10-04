import { expect, request as playwrightRequest, test } from "@playwright/test";
import { ADMIN_ACCOUNT, BACKEND_URL, getTestEnv, uniqueName } from "../support/env";

const endpoint = "/api/cats/archiving-reasons";

test.describe("archiving reasons API", () => {
  test.beforeEach(async ({ request }) => {
    const { staffTestUser } = getTestEnv();
    const login = await request.post("/auth/login", {
      data: { email: staffTestUser.email, password: staffTestUser.password },
    });
    expect(login.status()).toBe(201);
  });

  test("enforces active name uniqueness within, but not across, test partitions", async ({ request }) => {
    const name = uniqueName("Partitioned archiving reason");
    const testReasonIds: string[] = [];
    const regularReasonIds: string[] = [];
    const regularUser = await playwrightRequest.newContext({ baseURL: BACKEND_URL });

    try {
      const regularLogin = await regularUser.post("/auth/login", {
        data: { email: ADMIN_ACCOUNT.email, password: ADMIN_ACCOUNT.password },
      });
      expect(regularLogin.status()).toBe(201);

      const testCreate = await request.post(endpoint, { data: { name } });
      expect(testCreate.status()).toBe(201);
      testReasonIds.push(((await testCreate.json()) as { id: string }).id);

      const regularCreate = await regularUser.post(endpoint, { data: { name } });
      expect(regularCreate.status()).toBe(201);
      regularReasonIds.push(((await regularCreate.json()) as { id: string }).id);

      expect((await request.post(endpoint, { data: { name } })).status()).toBe(409);
      expect((await regularUser.post(endpoint, { data: { name } })).status()).toBe(409);
    } finally {
      for (const id of testReasonIds) {
        await request.delete(`${endpoint}/${id}`, { data: {} });
      }
      for (const id of regularReasonIds) {
        await regularUser.delete(`${endpoint}/${id}`, { data: {} });
      }
      await regularUser.dispose();
    }
  });
});
