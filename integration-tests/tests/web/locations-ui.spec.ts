import { expect, test } from "@playwright/test";
import { createLocationViaApi, loginViaApi } from "../support/backend-helpers";
import { getTestEnv, uniqueName } from "../support/env";
import type { Locator, Page } from "@playwright/test";

async function authenticateAsTestUser(page: import("@playwright/test").Page) {
  const { staffTestUser } = getTestEnv();
  await loginViaApi(page, staffTestUser.email, staffTestUser.password);
}

async function authenticateAsAdmin(page: import("@playwright/test").Page) {
  const { adminTestUser } = getTestEnv();
  await loginViaApi(page, adminTestUser.email, adminTestUser.password);
}

async function openShelterManagement(page: Page) {
  const locationsLoaded = page.waitForResponse(
    (response) =>
      response.url().includes("/api/locations") &&
      response.request().method() === "GET",
  );
  await page.goto("/shelter-management");
  expect((await locationsLoaded).status()).toBe(200);
}

async function findLocationRow(
  page: Page,
  locationName: string,
): Promise<Locator> {
  const row = page.locator("div.rounded-lg").filter({ hasText: locationName });
  const pagination = page.getByRole("navigation", { name: "List pagination" });

  for (let pageNumber = 0; pageNumber < 50; pageNumber += 1) {
    if (await row.count()) return row;
    const nextPage = pagination.getByRole("button", { name: "Next" });
    if (!(await nextPage.count()) || (await nextPage.isDisabled())) break;
    await nextPage.click();
  }

  throw new Error(
    `Location was not found in the shelter editor: ${locationName}`,
  );
}

test.describe("locations UI", () => {
  test("authenticated test user sees the cats list with search and add-cat controls", async ({
    page,
  }) => {
    await authenticateAsTestUser(page);
    await page.goto("/");

    await expect(
      page.getByText("Friends of Larnaca Cats", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Add cat" })).toBeVisible();
    await expect(page.getByLabel("Search cats")).toBeVisible();
    await page.getByRole("button", { name: "Filters" }).click();
    await expect(page.getByLabel("Tag")).toBeVisible();
    await expect(
      page.getByText("All locations", { exact: true }),
    ).toBeVisible();
  });

  test("admin can create an active location with a unique prefix and see it in the shelter editor", async ({
    page,
  }) => {
    const locationName = uniqueName("Editor Created Location");

    await authenticateAsAdmin(page);
    await openShelterManagement(page);

    await expect(
      page.getByRole("heading", { name: "Locations" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Add location" }).click();

    const newLocationForm = page.locator("#new-location-form");
    await newLocationForm
      .getByPlaceholder("New location name")
      .fill(locationName);
    await newLocationForm
      .getByPlaceholder("Description")
      .fill("Created from the shelter editor");
    await newLocationForm.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Location added.")).toBeVisible();
    const createdLocationRow = await findLocationRow(page, locationName);
    await expect(createdLocationRow).toBeVisible();
  });

  test("admin can edit a location", async ({ page }) => {
    const originalName = uniqueName("Editable Location");
    const updatedName = uniqueName("Edited Location");

    await authenticateAsAdmin(page);

    await createLocationViaApi(page, originalName, "Seeded from API");

    await openShelterManagement(page);

    const row = await findLocationRow(page, originalName);
    await expect(row).toBeVisible();
    await row
      .getByRole("button", { name: `Edit ${originalName}`, exact: true })
      .click();

    const editRow = page
      .locator("div.rounded-lg")
      .filter({ has: page.locator("select") });
    await editRow.locator("input").first().fill(updatedName);
    await editRow.getByRole("button", { name: "Save", exact: true }).click();

    await expect(page.getByText("Location updated.")).toBeVisible();
    await expect(page.getByText(updatedName, { exact: true })).toBeVisible();
  });

  test("admin can remove (archive) a location", async ({ page }) => {
    const locationName = uniqueName("Removable Location");
    const replacementName = uniqueName("Replacement Location");

    await authenticateAsAdmin(page);

    await createLocationViaApi(page, locationName, "Seeded from API");
    await createLocationViaApi(
      page,
      replacementName,
      "Replacement for location removal",
    );

    await openShelterManagement(page);

    const row = await findLocationRow(page, locationName);
    await expect(row).toBeVisible();
    await row
      .getByRole("button", { name: `Remove ${locationName}`, exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByLabel("Move cats to")
      .selectOption({ label: replacementName });
    await page.getByRole("button", { name: "Move cats and remove" }).click();

    await expect(page.getByText("Location removed.")).toBeVisible();
    await expect(page.getByText(locationName, { exact: true })).toHaveCount(0);
  });
});
