import { expect, request as playwrightRequest, test } from "@playwright/test";
import { BACKEND_URL, getTestEnv, uniqueName } from "../support/env";

test.describe("locations API", () => {
  test.beforeEach(async ({ request }) => {
    const { staffTestUser } = getTestEnv();

    const loginResponse = await request.post("/auth/login", {
      data: {
        email: staffTestUser.email,
        password: staffTestUser.password,
      },
    });

    expect(loginResponse.status()).toBe(201);
  });

  test("should create an active location owned by the test user", async ({ request }) => {
    const name = uniqueName("Downtown Shelter");

    const response = await request.post("/api/locations", {
      data: {
        name,
        description: "Main downtown shelter facility",
      },
    });

    expect(response.status()).toBe(201);
    const body = (await response.json()) as {
      id?: string;
      name?: string;
      status?: string;
      isTest?: boolean;
      description?: string | null;
    };
    expect(body.id).toBeDefined();
    expect(body.name).toBe(name);
    expect(body.status).toBe("ACTIVE");
    expect(body.isTest).toBe(true);
    expect(body.description).toBe("Main downtown shelter facility");
  });

  test("should create a location with a specified owner", async ({ request }) => {
    const meResponse = await request.get("/auth/me");
    const meBody = (await meResponse.json()) as { id?: string };
    const userId = meBody.id;

    const name = uniqueName("Foster Home");

    const response = await request.post("/api/locations", {
      data: {
        name,
        description: "Foster caregiver's home",
        ownerId: userId,
      },
    });

    expect(response.status()).toBe(201);
    const body = (await response.json()) as { name?: string; ownerId?: string | null };
    expect(body.name).toBe(name);
    expect(body.ownerId).toBe(userId);
  });

  test("should reject duplicate location names", async ({ request }) => {
    const name = uniqueName("Unique Shelter");

    const response1 = await request.post("/api/locations", {
      data: { name },
    });
    expect(response1.status()).toBe(201);

    const response2 = await request.post("/api/locations", {
      data: { name },
    });
    expect(response2.status()).toBe(409);
    const body = (await response2.json()) as { message?: string };
    expect(body.message).toBeDefined();
  });

  test("should reject an empty location name", async ({ request }) => {
    const response = await request.post("/api/locations", {
      data: {
        name: "",
      },
    });

    expect(response.status()).toBe(400);
  });

  test("should reject an unknown owner", async ({ request }) => {
    const response = await request.post("/api/locations", {
      data: {
        name: uniqueName("Bad Owner"),
        ownerId: "00000000-0000-0000-0000-000000000000",
      },
    });

    expect(response.status()).toBe(400);
  });

  test("should list paginated locations and include the created location on the first page", async ({ request }) => {
    const name = uniqueName("Searchable Shelter");
    await request.post("/api/locations", {
      data: { name },
    });

    const response = await request.get("/api/locations?limit=100&skip=0");
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      data?: Array<{ id: string; name: string }>;
      total?: number;
      skip?: number;
      limit?: number;
    };
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(typeof body.total).toBe("number");
    expect(body.skip).toBe(0);
    expect(body.limit).toBe(100);

    const names = body.data?.map((location) => location.name) ?? [];
    expect(names).toContain(name);
  });

  test("should filter locations by status", async ({ request }) => {
    const activeName = uniqueName("Active Shelter");
    const inactiveName = uniqueName("Inactive Shelter");

    const active = await request.post("/api/locations", { data: { name: activeName } });
    const inactive = await request.post("/api/locations", { data: { name: inactiveName } });

    const inactiveId = ((await inactive.json()) as { id?: string }).id;
    const activeId = ((await active.json()) as { id?: string }).id;

    await request.patch(`/api/locations/${inactiveId}`, {
      data: { status: "INACTIVE" },
    });

    const response = await request.get("/api/locations?status=INACTIVE");
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as {
      data?: Array<{ id: string; status: string; name: string }>;
    };
    const inactiveNames = body.data?.map((location) => location.name) ?? [];
    expect(inactiveNames).toContain(inactiveName);
    expect(inactiveNames).not.toContain(activeName);
    expect(body.data?.every((location) => location.status === "INACTIVE")).toBe(true);
  });

  test("should filter locations by owner", async ({ request }) => {
    const meResponse = await request.get("/auth/me");
    const meBody = (await meResponse.json()) as { id?: string };
    const userId = meBody.id;

    const ownedName = uniqueName("Owned Location");
    await request.post("/api/locations", {
      data: { name: ownedName, ownerId: userId },
    });

    const response = await request.get(`/api/locations?ownerId=${userId}`);
    expect(response.ok()).toBeTruthy();

    const body = (await response.json()) as { data?: Array<{ name: string }> };
    const names = body.data?.map((location) => location.name) ?? [];
    expect(names).toContain(ownedName);
  });

  test("should reject an invalid status filter", async ({ request }) => {
    const response = await request.get("/api/locations?status=GONE");
    expect(response.status()).toBe(400);
  });

  test("should get a single location by ID", async ({ request }) => {
    const name = uniqueName("Get By Id");
    const createResponse = await request.post("/api/locations", { data: { name } });
    const createBody = (await createResponse.json()) as { id?: string };
    const locationId = createBody.id;

    const getResponse = await request.get(`/api/locations/${locationId}`);
    expect(getResponse.ok()).toBeTruthy();

    const body = (await getResponse.json()) as { id?: string; name?: string };
    expect(body.id).toBe(locationId);
    expect(body.name).toBe(name);
  });

  test("should return 404 for a non-existent location", async ({ request }) => {
    const response = await request.get("/api/locations/00000000-0000-0000-0000-000000000000");
    expect(response.status()).toBe(404);
  });

  test("should update location name and description", async ({ request }) => {
    const originalName = uniqueName("Update Me");
    const createResponse = await request.post("/api/locations", {
      data: { name: originalName, description: "Original description" },
    });
    const createBody = (await createResponse.json()) as { id?: string };

    const updatedName = uniqueName("Updated");
    const updateResponse = await request.patch(`/api/locations/${createBody.id}`, {
      data: {
        name: updatedName,
        description: "Updated description",
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const body = (await updateResponse.json()) as {
      id?: string;
      name?: string;
      description?: string | null;
    };
    expect(body.id).toBe(createBody.id);
    expect(body.name).toBe(updatedName);
    expect(body.description).toBe("Updated description");
  });

  test("should update location status", async ({ request }) => {
    const name = uniqueName("Status Test");
    const createResponse = await request.post("/api/locations", { data: { name } });
    const createBody = (await createResponse.json()) as { id?: string };

    const updateResponse = await request.patch(`/api/locations/${createBody.id}`, {
      data: { status: "INACTIVE" },
    });
    expect(updateResponse.ok()).toBeTruthy();

    const body = (await updateResponse.json()) as { status?: string };
    expect(body.status).toBe("INACTIVE");
  });

  test("should reject an update with a duplicate name", async ({ request }) => {
    const name1 = uniqueName("Loc One");
    const name2 = uniqueName("Loc Two");

    const loc1Response = await request.post("/api/locations", { data: { name: name1 } });
    const loc2Response = await request.post("/api/locations", { data: { name: name2 } });

    const loc2Id = ((await loc2Response.json()) as { id?: string }).id;

    const updateResponse = await request.patch(`/api/locations/${loc2Id}`, {
      data: { name: name1 },
    });
    expect(updateResponse.status()).toBe(409);
  });

  test("should archive a location (soft delete)", async ({ request }) => {
    const name = uniqueName("Archive Me");
    const createResponse = await request.post("/api/locations", { data: { name } });
    const createBody = (await createResponse.json()) as { id?: string };

    const deleteResponse = await request.delete(`/api/locations/${createBody.id}`);
    expect(deleteResponse.status()).toBe(204);

    const getResponse = await request.get(`/api/locations/${createBody.id}`);
    expect(getResponse.ok()).toBeTruthy();

    const body = (await getResponse.json()) as { status?: string };
    expect(body.status).toBe("ARCHIVED");
  });

  test("should require authentication for location endpoints", async () => {
    const anonymous = await playwrightRequest.newContext({
      baseURL: BACKEND_URL,
    });

    const response = await anonymous.get("/api/locations");
    expect(response.status()).toBe(401);

    await anonymous.dispose();
  });
});