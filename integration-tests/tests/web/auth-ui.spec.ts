import { expect, test } from "@playwright/test";

const adminEmail = process.env.INTEGRATION_ADMIN_EMAIL ?? "admin@shelter.local";
const adminPassword = process.env.INTEGRATION_ADMIN_PASSWORD ?? "admin12345";

test.describe("frontend auth flow", () => {
  test("user can sign in through UI and reach dashboard", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill(adminEmail);
    await page.getByLabel("Password").fill(adminPassword);
    await page.getByRole("button", { name: "Sign in with Email" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible();
    await expect(page.getByText(adminEmail)).toBeVisible();
    await expect(page.getByText("admin", { exact: true })).toBeVisible();
  });

  test("admin can register a user while the user list remains visible", async ({ page }) => {
    const email = `ui-registration-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    await page.goto("/login?next=/admin/users");
    await page.getByLabel("Email").fill(adminEmail);
    await page.getByLabel("Password").fill(adminPassword);
    await page.getByRole("button", { name: "Sign in with Email" }).click();

    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Register a user" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "User list" })).toBeVisible();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Full name").fill("UI Registered User");
    await page.getByLabel("Password").fill("Password123!");
    await page.getByLabel("Test user").check();
    await page.getByRole("button", { name: "Register user" }).click();

    await expect(page.getByText(`${email} was registered successfully.`)).toBeVisible();
    await expect(page.getByRole("heading", { name: "User list" })).toBeVisible();
    await expect(page.getByText("UI Registered User")).toBeVisible();
    await expect(page.getByText(email).first()).toBeVisible();
    await expect(page.getByText("Test user").last()).toBeVisible();
  });
});
