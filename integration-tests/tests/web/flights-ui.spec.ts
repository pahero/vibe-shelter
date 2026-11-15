import { expect, test } from "@playwright/test";
import {
  catPhotoPath,
  createCatViaApi,
  loginViaApi,
} from "../support/backend-helpers";
import { getTestEnv, uniqueName } from "../support/env";

async function markCatAsFlightCandidate(
  page: import("@playwright/test").Page,
  catId: string,
) {
  await page.goto(`/cats/${catId}`);
  await page.getByRole("button", { name: "Mark as flight candidate" }).click();
  await expect(
    page.getByRole("button", { name: "Unmark flight candidate" }),
  ).toBeVisible();
}

async function createFlightAndAssignCat(
  page: import("@playwright/test").Page,
  catId: string,
) {
  const airport = uniqueName("Flight Airport");
  const flightNumber = uniqueName("CY");
  await page.goto("/flights/new");
  await page.getByLabel(/Airport/).fill(airport);
  await page.getByLabel("Flight number").fill(flightNumber);
  const createResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/flights") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save" }).click();
  const created = await createResponse;
  expect(created.status()).toBe(201);
  const { id: flightId } = (await created.json()) as { id: string };
  await expect(page).toHaveURL(`/flights/${flightId}`);

  await page.getByLabel("Cat to assign").selectOption(catId);
  const assignmentResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/flights/${flightId}/cats`) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Assign", exact: true }).click();
  expect((await assignmentResponse).status()).toBe(201);
  return flightId;
}

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

test("user can create a flight, assign a cat, and delete the flight", async ({
  page,
}) => {
  const { staffTestUser } = getTestEnv();
  await loginViaApi(page, staffTestUser.email, staffTestUser.password);
  const cat = await createCatViaApi(page, {
    name: uniqueName("Flight delete cat"),
  });
  await markCatAsFlightCandidate(page, cat.id);
  const flightId = await createFlightAndAssignCat(page, cat.id);

  await expect(page.getByRole("link", { name: cat.name })).toBeVisible();
  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/flights/${flightId}`) &&
      response.request().method() === "DELETE",
  );
  await page.getByRole("button", { name: "Delete flight" }).click();
  expect((await deleteResponse).status()).toBe(204);
  await expect(page.getByText(/This flight is deleted/)).toBeVisible();
});

test("archived flight assignment no longer hides a candidate from the filtered list", async ({
  page,
}) => {
  const { staffTestUser } = getTestEnv();
  await loginViaApi(page, staffTestUser.email, staffTestUser.password);
  const catName = uniqueName("Flight archive candidate");
  const cat = await createCatViaApi(page, { name: catName });
  await markCatAsFlightCandidate(page, cat.id);
  const flightId = await createFlightAndAssignCat(page, cat.id);

  const archiveResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/flights/${flightId}/archive`) &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Archive flight" }).click();
  expect((await archiveResponse).status()).toBe(201);
  await expect(page.getByText(/This flight is archived/)).toBeVisible();

  // Archiving intentionally clears candidate status; mark it again to verify
  // the archived assignment is not counted as an active-flight assignment.
  await markCatAsFlightCandidate(page, cat.id);
  await page.goto("/flights");
  const searchCats = page.getByLabel("Search cats");
  await searchCats.fill(catName);
  await expect(
    page.getByRole("link", { name: catName, exact: true }),
  ).toBeVisible();
});
