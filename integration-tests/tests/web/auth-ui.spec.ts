import { expect, test } from "@playwright/test";
import { getTestEnv, uniqueEmail, uniqueName } from "../support/env";

test.describe("frontend auth flow", () => {
  test("pre-registered test user can sign in through UI and reach the cats list", async ({ page }) => {
    const { staffTestUser } = getTestEnv();

    await page.goto("/login");

    await page.getByLabel("Email").fill(staffTestUser.email);
    await page.getByLabel("Password").fill(staffTestUser.password);
    await page.getByRole("button", { name: "Sign in with Email" }).click();

    await expect(page.getByLabel("Search cats")).toBeVisible();
    await expect(page.getByRole("link", { name: "User profile" })).toBeVisible();

    await expect(page.getByRole("link", { name: "Register users" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Edit shelter" })).toHaveCount(0);

    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === "shelter_session")?.httpOnly).toBe(true);
    const initialRefreshToken = cookies.find((cookie) => cookie.name === "shelter_refresh")?.value;
    expect(initialRefreshToken).toBeTruthy();
    await expect(page.getByText("Loading cat cards...")).toHaveCount(0);

    await page.context().addCookies([
      { name: "shelter_session", value: "expired-access-token", url: process.env.FRONTEND_URL ?? "http://localhost:4001", httpOnly: true, sameSite: "Lax" },
    ]);
    const refreshRequest = page.waitForResponse(
      (response) => response.url().includes("/auth/token") && response.request().method() === "POST",
    );
    const catsRequest = page.waitForResponse(
      (response) => response.url().includes("/api/cats?") && response.request().method() === "GET" && response.status() === 200,
    );
    await page.getByLabel("Search cats").fill("refresh-check");
    expect((await refreshRequest).status()).toBe(200);
    expect((await catsRequest).status()).toBe(200);
    const rotatedCookies = await page.context().cookies();
    expect(rotatedCookies.find((cookie) => cookie.name === "shelter_refresh")?.value).not.toBe(initialRefreshToken);

    const logoutRequest = page.waitForResponse(
      (response) => response.url().includes("/auth/logout") && response.request().method() === "POST",
    );
    await page.goto("/my-user");
    await expect(page.getByRole("heading", { name: staffTestUser.fullName })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    expect((await logoutRequest).status()).toBe(200);
    const loggedOutCookies = await page.context().cookies();
    expect(loggedOutCookies.find((cookie) => cookie.name === "shelter_refresh")).toBeUndefined();
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
    await expect(page.getByRole("heading", { name: "User list" })).toBeVisible();
    await page.getByRole("button", { name: "Register user" }).click();
    await expect(page.getByRole("heading", { name: "Register a user" })).toBeVisible();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Full name").fill(fullName);
    await page.getByLabel("Password").fill("Password123!");
    await page.getByRole("radio", { name: "Test user", exact: true }).check();
    const registration = page.waitForResponse(
      (response) => response.url().includes("/admin/users") && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "Register user" }).click();
    expect((await registration).status()).toBe(201);

    await expect(page.getByRole("status")).toContainText("was registered successfully.");
  });
});
