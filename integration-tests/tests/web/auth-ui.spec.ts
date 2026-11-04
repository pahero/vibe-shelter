import { expect, test } from "@playwright/test";
import { getTestEnv, uniqueEmail, uniqueName } from "../support/env";

test.describe("frontend auth flow", () => {
  test("pre-registered test user can sign in through UI and reach the cats list", async ({
    page,
  }) => {
    const { staffTestUser } = getTestEnv();

    await page.goto("/login");

    await page.getByLabel("Email").fill(staffTestUser.email);
    await page.getByLabel("Password").fill(staffTestUser.password);
    await page.getByRole("button", { name: "Sign in with Email" }).click();

    await expect(page.getByLabel("Search cats")).toBeVisible();
    await page.getByRole("button", { name: "User menu" }).click();
    await expect(page.getByRole("menuitem", { name: "Profile" })).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Register users" }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Edit shelter" })).toHaveCount(
      0,
    );

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(
      (cookie) =>
        cookie.name === "shelter_session" || cookie.name === "__Host-session",
    );
    const refreshCookie = cookies.find(
      (cookie) =>
        cookie.name === "shelter_refresh" || cookie.name === "__Host-refresh",
    );
    expect(sessionCookie?.httpOnly).toBe(true);
    const initialRefreshToken = refreshCookie?.value;
    expect(initialRefreshToken).toBeTruthy();
    await expect(page.getByText("Loading cat cards...")).toHaveCount(0);

    await page.context().addCookies([
      {
        name: sessionCookie!.name,
        value: "expired-access-token",
        url: process.env.FRONTEND_URL ?? "http://localhost:4001",
        httpOnly: true,
        secure: sessionCookie!.secure,
        sameSite: "Lax",
      },
    ]);
    const refreshRequest = page.waitForResponse(
      (response) =>
        response.url().includes("/auth/token") &&
        response.request().method() === "POST",
    );
    const catsRequest = page.waitForResponse(
      (response) =>
        response.url().includes("/api/cats?") &&
        response.request().method() === "GET" &&
        response.status() === 200,
    );
    await page.getByLabel("Search cats").fill("refresh-check");
    expect((await refreshRequest).status()).toBe(200);
    expect((await catsRequest).status()).toBe(200);
    const rotatedCookies = await page.context().cookies();
    expect(
      rotatedCookies.find((cookie) => cookie.name === refreshCookie!.name)
        ?.value,
    ).not.toBe(initialRefreshToken);

    await page.goto("/");
    await page.getByRole("button", { name: "User menu" }).click();
    const logoutRequest = page.waitForResponse(
      (response) =>
        response.url().includes("/auth/logout") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Log out" }).click();
    expect((await logoutRequest).status()).toBe(200);
    const loggedOutCookies = await page.context().cookies();
    expect(
      loggedOutCookies.find((cookie) => cookie.name === refreshCookie!.name),
    ).toBeUndefined();
  });

  test("admin can submit registration for a test user", async ({ page }) => {
    const { adminTestUser } = getTestEnv();
    const email = uniqueEmail("ui-registered");
    const fullName = uniqueName("UI Registered User");

    await page.goto("/login?next=/shelter-management");
    await page.getByLabel("Email").fill(adminTestUser.email);
    await page.getByLabel("Password").fill(adminTestUser.password);
    await page.getByRole("button", { name: "Sign in with Email" }).click();

    await expect(page).toHaveURL(/\/shelter-management$/);
    await page.getByRole("button", { name: "Users" }).click();
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await page.getByRole("button", { name: "Register user" }).click();
    await expect(
      page.getByRole("heading", { name: "Register a user" }),
    ).toBeVisible();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Full name").fill(fullName);
    await page.getByLabel("Test user").check();
    const registration = page.waitForResponse(
      (response) =>
        response.url().includes("/admin/users") &&
        response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Register user" }).click();
    expect((await registration).status()).toBe(201);

    await expect(page.getByRole("status")).toContainText(
      `Temporary password for ${email} is:`,
    );
  });
});
