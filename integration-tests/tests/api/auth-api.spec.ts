import { expect, test } from "../support/api-test";
import { getTestEnv } from "../support/env";

function cookieValue(setCookie: string | undefined, name: string): string {
  const cookie = setCookie?.split(/,(?=[^;,]+=)/).find((value) => value.trim().startsWith(`${name}=`));
  if (!cookie) throw new Error(`Expected ${name} cookie`);
  return cookie.trim().slice(name.length + 1).split(";")[0];
}

test.describe("backend auth API", () => {
  test("health endpoint is reachable", async ({ request }) => {
    const response = await request.get("/health");
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { status?: string; timestamp?: string };
    expect(body.status).toBe("ok");
    expect(typeof body.timestamp).toBe("string");
  });

  test("login, refresh rotation, and logout use HttpOnly cookies", async ({ request }) => {
    const { staffTestUser } = getTestEnv();
    const loginResponse = await request.post("/auth/login", {
      data: { email: staffTestUser.email, password: staffTestUser.password },
    });
    expect(loginResponse.status()).toBe(200);
    expect(loginResponse.headers()["set-cookie"]).toContain("shelter_session=");
    expect(loginResponse.headers()["set-cookie"]).toContain("shelter_refresh=");
    expect(loginResponse.headers()["set-cookie"]).toMatch(/HttpOnly/i);
    expect(await loginResponse.json()).toMatchObject({
      email: staffTestUser.email,
      role: "staff",
      isTest: true,
      passwordChangeRequired: false,
    });

    const meResponse = await request.get("/auth/me");
    expect(meResponse.ok()).toBeTruthy();
    expect(await meResponse.json()).toMatchObject({ email: staffTestUser.email, role: "staff" });

    const oldRefreshCookie = cookieValue(loginResponse.headers()["set-cookie"], "shelter_refresh");
    const refreshResponse = await request.post("/auth/token");
    expect(refreshResponse.status()).toBe(200);
    expect(refreshResponse.headers()["set-cookie"]).toContain("shelter_refresh=");
    const newRefreshCookie = cookieValue(refreshResponse.headers()["set-cookie"], "shelter_refresh");
    expect(newRefreshCookie).not.toBe(oldRefreshCookie);

    const replayResponse = await request.post("/auth/token", {
      headers: { Cookie: `shelter_refresh=${oldRefreshCookie}` },
    });
    expect(replayResponse.status()).toBe(401);

    const logoutResponse = await request.post("/auth/logout");
    expect(logoutResponse.ok()).toBeTruthy();
    expect(logoutResponse.headers()["set-cookie"]).toContain("shelter_refresh=");
    expect(logoutResponse.headers()["set-cookie"]).toContain("Max-Age=0");
    expect((await request.get("/auth/me")).status()).toBe(401);
  });

  test("invalid credentials are rejected", async ({ request }) => {
    const response = await request.post("/auth/login", {
      data: { email: "nobody@shelter.test", password: "WrongPass123!" },
    });
    expect(response.status()).toBe(401);
  });
});
