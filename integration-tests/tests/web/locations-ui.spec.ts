import { expect, test } from "@playwright/test";
import { createLocationViaApi, loginViaApi } from "../support/backend-helpers";
import { getTestEnv, uniqueName } from "../support/env";

async function authenticateAsTestUser(page: import("@playwright/test").Page) {
  const { staffTestUser } = getTestEnv();
  await loginViaApi(page, staffTestUser.email, staffTestUser.password);
}

async function authenticateAsAdmin(page: import("@playwright/test").Page) {
  const { adminTestUser } = getTestEnv();
  await loginViaApi(page, adminTestUser.email, adminTestUser.password);
}

test.describe("locations UI", () => {
  test("authenticated test user sees the cats list with search and add-cat controls", async ({ page }) => {
    await authenticateAsTestUser(page);
    await page.goto("/");

    await expect(page.getByText("Cats list")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Add Cat" })).toBeVisible();
    await expect(page.getByLabel("Search cats")).toBeVisible();
    await expect(page.getByLabel("Tag")).toBeVisible();
    await expect(page.getByText("All locations", { exact: true })).toBeVisible();
  });

  test("admin can create an active location with a unique prefix and see it in the shelter editor", async ({ page }) => {
    const locationName = uniqueName("Editor Created Location");

    await authenticateAsAdmin(page);
    await page.goto("/edit-shelter");

    await expect(page.getByRole("heading", { name: "Edit shelter" })).toBeVisible();
    await page.getByRole("button", { name: "+ New Location" }).click();

    const newLocationForm = page.locator("#new-location-form");
    await newLocationForm.getByPlaceholder("New location name").fill(locationName);
    await newLocationForm.getByPlaceholder("Description").fill("Created from the shelter editor");
    await newLocationForm.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Location added.")).toBeVisible();
    await expect(page.getByText(locationName, { exact: true })).toBeVisible();
  });

  test("admin can edit a location", async ({ page }) => {
    const originalName = uniqueName("Editable Location");
    const updatedName = uniqueName("Edited Location");

    await authenticateAsAdmin(page);

    await createLocationViaApi(page, originalName, "Seeded from API");

    await page.goto("/edit-shelter");

    const row = page.locator("div.rounded-lg").filter({ hasText: originalName });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Edit" }).click();

    const editRow = page.locator("div.rounded-lg").filter({ has: page.locator("select") });
    await editRow.locator("input").first().fill(updatedName);
    await editRow.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page.getByText("Location updated.")).toBeVisible();
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
  });

  test("admin can remove (archive) a location", async ({ page }) => {
    const locationName = uniqueName("Removable Location");

    await authenticateAsAdmin(page);

    await createLocationViaApi(page, locationName, "Seeded from API");

    await page.goto("/edit-shelter");

    const row = page.locator("div.rounded-lg").filter({ hasText: locationName });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Remove" }).click();

    await expect(page.getByText("Location removed.")).toBeVisible();
    await expect(page.getByText(locationName, { exact: true })).toHaveCount(0);
  });
});