import { expect, test } from "@playwright/test";
import { getTestEnv, uniqueEmail, uniqueName } from "../support/env";

test.describe("frontend auth flow", () => {
  test("pre-registered test user can sign in through UI and reach the cats list", async ({ page }) => {
    const { staffTestUser } = getTestEnv();

    await page.goto("/login");

    await page.getByLabel("Email").fill(staffTestUser.email);
    await page.getByLabel("Password").fill(staffTestUser.password);
    await page.getByRole("button", { name: "Sign in with Email" }).click();

    await expect(page.getByText("Cats list")).toBeVisible();
    await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
    await expect(page.getByText(staffTestUser.fullName)).toBeVisible();

    await expect(page.getByRole("link", { name: "Register users" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Edit shelter" })).toHaveCount(0);
  });

  test("admin can register a test user and see it in the user list", async ({ page }) => {
    const { adminTestUser } = getTestEnv();
    const email = uniqueEmail("ui-registered");
    const fullName = uniqueName("UI Registered User");

    await page.goto("/login?next=/admin/users");
    await page.getByLabel("Email").fill(adminTestUser.email);
    await page.getByLabel("Password").fill(adminTestUser.password);
    await page.getByRole("button", { name: "Sign in with Email" }).click();

    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Register a user" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "User list" })).toBeVisible();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Full name").fill(fullName);
    await page.getByLabel("Password").fill("Password123!");
    await page.getByRole("radio", { name: "Test user", exact: true }).check();
    await page.getByRole("button", { name: "Register user" }).click();

    await expect(page.getByText(`${email} was registered successfully.`)).toBeVisible();
    await expect(page.getByRole("heading", { name: "User list" })).toBeVisible();
    await expect(page.getByText(fullName, { exact: true })).toBeVisible();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
  });
});