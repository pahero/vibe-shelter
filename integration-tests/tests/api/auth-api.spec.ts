import { expect, test } from "@playwright/test";

const adminEmail = process.env.INTEGRATION_ADMIN_EMAIL ?? "admin@shelter.local";
const adminPassword = process.env.INTEGRATION_ADMIN_PASSWORD ?? "admin12345";

test.describe("backend auth API", () => {
  test("health endpoint is reachable", async ({ request }) => {
    const response = await request.get("/health");
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as { status?: string; timestamp?: string };
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
  });

  test("password login creates session and logout revokes it", async ({ request }) => {
    const loginResponse = await request.post("/auth/login", {
      data: {
        email: adminEmail,
        password: adminPassword,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();

    const meAfterLogin = await request.get("/auth/me");
    expect(meAfterLogin.ok()).toBeTruthy();

    const meBody = (await meAfterLogin.json()) as { email?: string; role?: string };
    expect(meBody.email).toBe(adminEmail);
    expect(meBody.role).toBe("admin");

    const logoutResponse = await request.post("/auth/logout");
    expect(logoutResponse.ok()).toBeTruthy();

    const meAfterLogout = await request.get("/auth/me");
    expect(meAfterLogout.status()).toBe(401);
  });
});
