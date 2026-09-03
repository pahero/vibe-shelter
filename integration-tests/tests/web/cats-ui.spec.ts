import { expect, test, type Page } from "@playwright/test";
import {
  catPhotoPath,
  createCatViaApi,
  createLocationViaApi,
  loginViaApi,
  uploadCatPhotoViaApi,
} from "../support/backend-helpers";
import { getTestEnv, uniqueName } from "../support/env";

async function authenticateAsStaff(page: Page) {
  const { staffTestUser } = getTestEnv();
  await loginViaApi(page, staffTestUser.email, staffTestUser.password);
}

test.describe("cats UI", () => {
  test("user can create a cat with a unique prefix, upload a photo and find it via search", async ({ page }) => {
    const locationName = uniqueName("Cat Housing Location");
    const catName = uniqueName("Misty");
    const microchip = `CHIP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await authenticateAsStaff(page);
    await page.goto("/");

    await createLocationViaApi(page, locationName, "Active location for new cats");
    await page.reload();

    await page.getByRole("button", { name: "+ Add Cat" }).click();

    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Add cat" }) });
    await expect(form.getByLabel("Location")).toBeEnabled();

    await form.getByLabel("Name *").fill(catName);
    await form.getByLabel("Color").fill("Grey-white");
    await form.getByLabel("Sex *").selectOption("FEMALE");
    await form.getByLabel("Neutering *").selectOption("STERILIZED");
    await form.getByLabel("Location").selectOption({ label: locationName });
    await form.getByLabel("Microchip number").fill(microchip);
    await form.getByRole("button", { name: "Add cat" }).click();

    await expect(page.getByText(`${catName} was added.`)).toBeVisible();

    // The new cat is findable on the first page via search.
    await page.getByLabel("Search cats").fill(catName);
    await expect(page.getByRole("heading", { name: catName })).toBeVisible();

    // Open the profile and upload cat1.jpg; as the first photo it becomes primary.
    await page.getByRole("link", { name: `Open profile for ${catName}` }).click();
    await page.waitForURL(/\/cats\/[a-z0-9-]+$/);
    const catId = page.url().split("/").pop() as string;
    await expect(page.getByRole("heading", { level: 1, name: catName })).toBeVisible();

    // Prove the photo actually reached the backend and was accepted: capture the
    // upload request and assert a 201 response, not just DOM changes.
    const uploadResponsePromise = page.waitForResponse(
      (res) => res.url().includes(`/api/cats/${catId}/photos`) && res.request().method() === "POST",
    );
    await page.locator('input[type="file"]').setInputFiles(catPhotoPath("cat1.jpg"));
    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.status()).toBe(201);

    await expect(page.getByRole("button", { name: `Open photo of ${catName}` })).toBeVisible();
    await expect(page.getByRole("button", { name: `Expand photo of ${catName}` })).toBeVisible();
  });

  test("user can open a cat profile from the cats list", async ({ page }) => {
    const locationName = uniqueName("Profile Location");
    const catName = uniqueName("Oliver");

    await authenticateAsStaff(page);
    await page.goto("/");

    const location = await createLocationViaApi(page, locationName);
    await createCatViaApi(page, { name: catName, locationId: location.id });
    await page.reload();

    await page.getByLabel("Search cats").fill(catName);
    await page.getByRole("link", { name: `Open profile for ${catName}` }).click();

    await expect(page).toHaveURL(/\/cats\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { level: 1, name: catName })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit details" })).toBeVisible();
  });

  test("user can edit cat details and see them reflected on the profile", async ({ page }) => {
    const locationName = uniqueName("Edit Location");
    const catName = uniqueName("Original Name");
    const updatedName = uniqueName("Renamed Cat");
    const updatedColor = `Marmalade-${Date.now()}`;

    await authenticateAsStaff(page);
    await page.goto("/");

    const location = await createLocationViaApi(page, locationName);
    const cat = await createCatViaApi(page, { name: catName, locationId: location.id, color: "Grey-white" });

await page.goto(`/cats/${cat.id}`);
    await expect(page.getByRole("heading", { level: 1, name: catName })).toBeVisible();

    await page.getByRole("button", { name: "Edit details" }).click();
    await page.getByLabel("Name *").fill(updatedName);
    await page.getByLabel("Color").fill(updatedColor);
    await page.getByLabel("Status").selectOption("ADOPTED");
    await page.getByRole("button", { name: "Save details" }).click();

    await expect(page.getByText("Cat details were updated.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: updatedName })).toBeVisible();

    const details = page.locator("dl");
    await expect(details.getByText(updatedColor, { exact: true })).toBeVisible();
    await expect(details.getByText("Adopted", { exact: true })).toBeVisible();
  });

  test("user can add a second photo and make it the primary photo", async ({ page }) => {
    const locationName = uniqueName("Photo Update Location");
    const catName = uniqueName("Photo Cat");

    await authenticateAsStaff(page);
    await page.goto("/");

    const location = await createLocationViaApi(page, locationName);
    const cat = await createCatViaApi(page, { name: catName, locationId: location.id });
    await uploadCatPhotoViaApi(page, cat.id, catPhotoPath("cat1.jpg"));

    await page.goto(`/cats/${cat.id}`);
    await expect(page.getByRole("heading", { level: 1, name: catName })).toBeVisible();

    // cat1.jpg uploaded via the API is the primary photo.
    const galleryButton = page.getByRole("button", { name: `Open photo of ${catName}` });
    await expect(galleryButton).toHaveCount(1);

    // Upload cat2.jpg through the UI; assert the backend accepted it.
    const uploadResponsePromise = page.waitForResponse(
      (res) => res.url().includes(`/api/cats/${cat.id}/photos`) && res.request().method() === "POST",
    );
    await page.locator('input[type="file"]').setInputFiles(catPhotoPath("cat2.jpg"));
    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.status()).toBe(201);
    await expect(galleryButton).toHaveCount(2);

    // The newest photo (cat2.jpg) is second in the gallery; make it primary.
    await galleryButton.nth(1).click();
    await expect(page.getByRole("dialog", { name: `Photo of ${catName}` })).toBeVisible();
    await expect(page.getByText("2 / 2")).toBeVisible();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await page.getByRole("button", { name: "Make primary" }).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();

    // cat2.jpg is now primary: its photo viewer no longer offers "Make primary".
    await galleryButton.nth(1).click();
    await expect(page.getByRole("dialog", { name: `Photo of ${catName}` })).toBeVisible();
    await page.getByRole("button", { name: "Actions", exact: true }).click();
    await expect(page.getByRole("button", { name: "Make primary" })).toHaveCount(0);
    await page.getByRole("button", { name: "Close", exact: true }).click();
  });

  test("edit form rejects an empty cat name", async ({ page }) => {
    const locationName = uniqueName("Validation Location");
    const catName = uniqueName("Validation Cat");

    await authenticateAsStaff(page);
    await page.goto("/");

const location = await createLocationViaApi(page, locationName);
    const cat = await createCatViaApi(page, { name: catName, locationId: location.id });

    await page.goto(`/cats/${cat.id}`);
    await expect(page.getByRole("heading", { level: 1, name: catName })).toBeVisible();

    await page.getByRole("button", { name: "Edit details" }).click();
    await page.getByLabel("Name *").fill("");
    await page.getByRole("button", { name: "Save details" }).click();

    await expect(page.getByText("Cat name is required.")).toBeVisible();
  });
});
