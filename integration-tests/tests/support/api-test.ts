import { APIRequestContext, expect, request as playwrightRequest, test as base } from "@playwright/test";
import { BACKEND_URL, getTestEnv } from "./env";

type ApiFixtures = { request: APIRequestContext };

export const test = base.extend<ApiFixtures>({
  request: async ({}, use) => {
    const authenticated = await playwrightRequest.newContext({ baseURL: BACKEND_URL });
    const { staffTestUser } = getTestEnv();
    const login = await authenticated.post("/auth/login", {
      data: { email: staffTestUser.email, password: staffTestUser.password },
    });
    expect(login.status()).toBe(200);
    await use(authenticated);
    await authenticated.dispose();
  },
});

export { expect };
