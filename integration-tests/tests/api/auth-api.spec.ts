import { expect, test } from "@playwright/test";
import { getTestEnv } from "../support/env";

test.describe("backend auth API", () => {
  test("health endpoint is reachable", async ({ request }) => {
    const response = await request.get("/health");
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as { status?: string; timestamp?: string };
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
  });

  test("pre-registered test user can log in, fetch profile and log out", async ({ request }) => {
    const { staffTestUser } = getTestEnv();

    const loginResponse = await request.post("/auth/login", {
      data: {
        email: staffTestUser.email,
        password: staffTestUser.password,
      },
    });
    expect(loginResponse.status()).toBe(201);

    const meResponse = await request.get("/auth/me");
    expect(meResponse.ok()).toBeTruthy();

    const meBody = (await meResponse.json()) as {
      id?: string;
      email?: string;
      role?: string;
      isTest?: boolean;
    };
    expect(meBody.id).toBeDefined();
    expect(meBody.email).toBe(staffTestUser.email);
    expect(meBody.role).toBe("staff");
    expect(meBody.isTest).toBe(true);

    const logoutResponse = await request.post("/auth/logout");
    expect(logoutResponse.ok()).toBeTruthy();

    const meAfterLogout = await request.get("/auth/me");
    expect(meAfterLogout.status()).toBe(401);
  });

  test("invalid credentials are rejected", async ({ request }) => {
    const response = await request.post("/auth/login", {
      data: {
        email: "nobody@shelter.test",
        password: "WrongPass123!",
      },
    });

    expect(response.status()).toBe(401);
  });
});