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
});
