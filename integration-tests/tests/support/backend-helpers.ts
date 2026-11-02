import fs from "node:fs";
import path from "node:path";
import { Page, request } from "@playwright/test";
import { BACKEND_URL, FRONTEND_URL } from "./env";
import { getTestEnv, uniqueName } from "./env";

export type CatPhotoName = "cat1.jpg" | "cat2.jpg";

export function catPhotoPath(photo: CatPhotoName): string {
  return path.resolve(__dirname, "../../data", photo);
}

export async function loginViaApi(page: Page, email: string, password: string): Promise<void> {
  const response = await page.request.post(`${BACKEND_URL}/auth/login`, {
    data: { email, password },
  });
  if (response.status() !== 200) {
    throw new Error(`Login via API failed (${response.status()}): ${await response.text()}`);
  }
  const cookies = response.headersArray()
    .filter((header) => header.name.toLowerCase() === "set-cookie")
    .map(({ value }) => {
      const [pair, ...attributes] = value.split(";");
      const separator = pair.indexOf("=");
      return {
        name: pair.slice(0, separator),
        value: pair.slice(separator + 1),
        httpOnly: attributes.some((attribute) => attribute.trim().toLowerCase() === "httponly"),
        secure: attributes.some((attribute) => attribute.trim().toLowerCase() === "secure"),
      };
    });
  const authCookie = (suffix: "session" | "refresh") => {
    const cookie = cookies.find(({ name }) => name === `shelter_${suffix}` || name === `__Host-${suffix}`);
    if (!cookie) throw new Error(`Login response did not set the ${suffix} cookie`);
    return cookie;
  };
  const sessionCookie = authCookie("session");
  const refreshCookie = authCookie("refresh");
  await page.context().addCookies([
    { ...sessionCookie, url: FRONTEND_URL, sameSite: "Lax" },
    { ...refreshCookie, url: FRONTEND_URL, sameSite: "Lax" },
  ]);
}

async function authHeaders(page: Page): Promise<Record<string, string>> {
  const cookies = await page.context().cookies(FRONTEND_URL);
  if (!cookies.some((cookie) => cookie.name === "shelter_session" || cookie.name === "__Host-session")) throw new Error("Authenticated API helper requires loginViaApi first");
  return { Cookie: cookies.map(({ name, value }) => `${name}=${value}`).join("; ") };
}

export async function createLocationViaApi(
  page: Page,
  name: string,
  description?: string,
): Promise<{ id: string; name: string }> {
  const { adminTestUser } = getTestEnv();
  const adminRequest = await request.newContext({ baseURL: BACKEND_URL });
  try {
    const loginResponse = await adminRequest.post("/auth/login", {
      data: { email: adminTestUser.email, password: adminTestUser.password },
    });
    if (loginResponse.status() !== 200) {
      throw new Error(`Admin API login failed (${loginResponse.status()}): ${await loginResponse.text()}`);
    }
    const cookieHeader = loginResponse.headersArray()
      .filter((header) => header.name.toLowerCase() === "set-cookie")
      .map((header) => header.value.split(";", 1)[0])
      .join("; ");
    const response = await adminRequest.post("/api/locations", {
      headers: { Cookie: cookieHeader },
      data: { name, ...(description ? { description } : {}) },
    });
    if (response.status() !== 201) {
      throw new Error(`Could not create location via API (${response.status()}): ${await response.text()}`);
    }
    return (await response.json()) as { id: string; name: string };
  } finally {
    await adminRequest.dispose();
  }
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
  const locationId = input.locationId ?? (await createLocationViaApi(page, uniqueName("Cat location"))).id;
  const response = await page.request.post(`${BACKEND_URL}/api/cats`, {
    headers: await authHeaders(page),
    data: {
      name: input.name,
      sex: input.sex ?? "UNKNOWN",
      sterilizationStatus: input.sterilizationStatus ?? "UNKNOWN",
      color: input.color ?? null,
      microchipNumber: input.microchipNumber ?? null,
      currentLocationId: locationId,
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
    headers: await authHeaders(page),
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
