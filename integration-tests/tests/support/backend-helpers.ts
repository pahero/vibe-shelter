import fs from "node:fs";
import path from "node:path";
import { Page } from "@playwright/test";
import { BACKEND_URL } from "./env";

export type CatPhotoName = "cat1.jpg" | "cat2.jpg";

export function catPhotoPath(photo: CatPhotoName): string {
  return path.resolve(__dirname, "../../data", photo);
}

export async function loginViaApi(page: Page, email: string, password: string): Promise<void> {
  const response = await page.request.post(`${BACKEND_URL}/auth/login`, {
    data: { email, password },
  });
  if (response.status() !== 201) {
    throw new Error(`Login via API failed (${response.status()}): ${await response.text()}`);
  }
}

export async function createLocationViaApi(
  page: Page,
  name: string,
  description?: string,
): Promise<{ id: string; name: string }> {
  const response = await page.request.post(`${BACKEND_URL}/api/locations`, {
    data: {
      name,
      ...(description ? { description } : {}),
    },
  });
  if (response.status() !== 201) {
    throw new Error(
      `Could not create location via API (${response.status()}): ${await response.text()}`,
    );
  }
  return (await response.json()) as { id: string; name: string };
}

export async function createCatViaApi(
  page: Page,
  input: {
    name: string;
    locationId?: string;
    sex?: "FEMALE" | "MALE" | "UNKNOWN";
    sterilizationStatus?: "STERILIZED" | "NOT_STERILIZED" | "UNKNOWN";
    color?: string;
    microchipNumber?: string;
  },
): Promise<{ id: string; name: string }> {
  const response = await page.request.post(`${BACKEND_URL}/api/cats`, {
    data: {
      name: input.name,
      sex: input.sex ?? "UNKNOWN",
      sterilizationStatus: input.sterilizationStatus ?? "UNKNOWN",
      color: input.color ?? null,
      microchipNumber: input.microchipNumber ?? null,
      currentLocationId: input.locationId ?? null,
    },
  });
  if (response.status() !== 201) {
    throw new Error(
      `Could not create cat via API (${response.status()}): ${await response.text()}`,
    );
  }
  return (await response.json()) as { id: string; name: string };
}

export async function uploadCatPhotoViaApi(
  page: Page,
  catId: string,
  photoFile: string,
  mimeType = "image/jpeg",
): Promise<void> {
  const response = await page.request.post(`${BACKEND_URL}/api/cats/${catId}/photos`, {
    multipart: {
      photo: {
        name: path.basename(photoFile),
        mimeType,
        buffer: fs.readFileSync(photoFile),
      },
    },
  });
  if (response.status() !== 201) {
    throw new Error(
      `Could not upload cat photo via API (${response.status()}): ${await response.text()}`,
    );
  }
}