import { expect, test } from "@playwright/test";
import { catPhotoPath, loginViaApi } from "../support/backend-helpers";
import { getTestEnv } from "../support/env";

test("user can create a flight with a photo", async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  const { staffTestUser } = getTestEnv();
  await loginViaApi(page, staffTestUser.email, staffTestUser.password);
  await page.goto("/flights/new");

  await expect(page.getByRole("link", { name: "Cancel" })).toHaveAttribute(
    "href",
    "/flights",
  );
  await expect(page.getByRole("button", { name: "Save" })).toBeVisible();

  await page.getByLabel(/Airport/).fill("Larnaca");
  const createFlight = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/flights") &&
      response.request().method() === "POST",
  );
  const photoInput = page.locator('input[type="file"][accept="image/*"]');
  await photoInput.setInputFiles(catPhotoPath("cat1.jpg"));
  expect(pageErrors).toEqual([]);
  await expect(page.getByAltText("Selected: cat1.jpg")).toBeVisible();
  const uploadPhoto = page.waitForResponse(
    (response) =>
      response.url().includes("/photos") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save" }).click();
  const flightResponse = await createFlight;
  expect(flightResponse.status()).toBe(201);
  expect((await uploadPhoto).status()).toBe(201);
  const flight = (await flightResponse.json()) as { id: string };

  await expect(page).toHaveURL(`/flights/${flight.id}`);
  await expect(
    page.getByRole("button", { name: "Open flight photo" }),
  ).toBeVisible();
});
