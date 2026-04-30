import { expect, test } from "@playwright/test";

const adminEmail = process.env.INTEGRATION_ADMIN_EMAIL ?? "admin@shelter.local";
const adminPassword = process.env.INTEGRATION_ADMIN_PASSWORD ?? "admin12345";

test.describe("locations API", () => {
  let authCookie: string;

  test.beforeAll(async ({ request }) => {
    // Login and get session cookie
    const loginResponse = await request.post("/auth/login", {
      data: {
        email: adminEmail,
        password: adminPassword,
      },
    });

    expect(loginResponse.ok()).toBeTruthy();
    
    // Extract session cookie from response headers
    const setCookieHeader = loginResponse.headers()["set-cookie"];
    if (setCookieHeader) {
      const cookieMatch = setCookieHeader.match(/connect\.sid=([^;]+)/);
      if (cookieMatch) {
        authCookie = cookieMatch[1];
      }
    }
  });

  test("should create a shelter location", async ({ request }) => {
    const uniqueName = `Downtown Shelter ${Date.now()}`;
    const response = await request.post("/api/locations", {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: uniqueName,
        type: "SHELTER",
        description: "Main downtown shelter facility",
      },
    });

    expect(response.status()).toBe(201);
    const body = (await response.json()) as {
      id?: string;
      name?: string;
      type?: string;
      status?: string;
      description?: string;
    };
    expect(body.id).toBeDefined();
    expect(body.name).toBe(uniqueName);
    expect(body.type).toBe("SHELTER");
    expect(body.status).toBe("ACTIVE");
    expect(body.description).toBe("Main downtown shelter facility");
  });

  test("should create a clinic location", async ({ request }) => {
    const uniqueName = `Emergency Vet Clinic ${Date.now()}`;
    const response = await request.post("/api/locations", {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: uniqueName,
        type: "CLINIC",
        description: "24/7 emergency veterinary clinic",
      },
    });

    expect(response.status()).toBe(201);
    const body = (await response.json()) as { type?: string; name?: string };
    expect(body.name).toBe(uniqueName);
    expect(body.type).toBe("CLINIC");
  });

  test("should create a foster location with owner", async ({ request }) => {
    // First get an admin user ID to use as owner
    const meResponse = await request.get("/auth/me", {
      headers: { Cookie: `connect.sid=${authCookie}` },
    });
    const meBody = (await meResponse.json()) as { id?: string };
    const userId = meBody.id;

    const uniqueName = `Foster Home - Sarah ${Date.now()}`;
    const response = await request.post("/api/locations", {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: uniqueName,
        type: "FOSTER",
        description: "Foster caregiver Sarah's home",
        ownerId: userId,
      },
    });

    expect(response.status()).toBe(201);
    const body = (await response.json()) as {
      type?: string;
      name?: string;
      ownerId?: string;
    };
    expect(body.name).toBe(uniqueName);
    expect(body.type).toBe("FOSTER");
    expect(body.ownerId).toBe(userId);
  });

  test("should reject duplicate location names", async ({ request }) => {
    const uniqueName = `Unique Shelter ${Date.now()}`;

    // Create first location
    const response1 = await request.post("/api/locations", {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: uniqueName,
        type: "SHELTER",
      },
    });
    expect(response1.status()).toBe(201);

    // Try to create duplicate
    const response2 = await request.post("/api/locations", {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: uniqueName,
        type: "CLINIC",
      },
    });

    expect(response2.status()).toBe(409);
    const body = (await response2.json()) as { message?: string };
    expect(body.message).toBeDefined();
  });

  test("should reject invalid location type", async ({ request }) => {
    const response = await request.post("/api/locations", {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: "Invalid Type Location",
        type: "INVALID_TYPE",
      },
    });

    expect(response.status()).toBe(400);
  });

  test("should list locations with pagination", async ({ request }) => {
    const response = await request.get("/api/locations?limit=10&skip=0", {
      headers: { Cookie: `connect.sid=${authCookie}` },
    });

    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as {
      data?: Array<{ id: string }>;
      total?: number;
      skip?: number;
      limit?: number;
    };
    expect(Array.isArray(body.data)).toBeTruthy();
    expect(typeof body.total).toBe("number");
    expect(body.skip).toBe(0);
    expect(body.limit).toBe(10);
  });

  test("should filter locations by type", async ({ request }) => {
    const response = await request.get("/api/locations?type=SHELTER", {
      headers: { Cookie: `connect.sid=${authCookie}` },
    });

    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { data?: Array<{ type: string }> };
    if (body.data && body.data.length > 0) {
      for (const location of body.data) {
        expect(location.type).toBe("SHELTER");
      }
    }
  });

  test("should filter locations by status", async ({ request }) => {
    const response = await request.get("/api/locations?status=ACTIVE", {
      headers: { Cookie: `connect.sid=${authCookie}` },
    });

    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { data?: Array<{ status: string }> };
    if (body.data && body.data.length > 0) {
      for (const location of body.data) {
        expect(location.status).toBe("ACTIVE");
      }
    }
  });

  test("should get single location by ID", async ({ request }) => {
    // Create a location first
    const createResponse = await request.post("/api/locations", {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: `Get Test Location ${Date.now()}`,
        type: "SHELTER",
      },
    });

    const createBody = (await createResponse.json()) as { id?: string };
    const locationId = createBody.id;

    // Get the location
    const getResponse = await request.get(`/api/locations/${locationId}`, {
      headers: { Cookie: `connect.sid=${authCookie}` },
    });

    expect(getResponse.ok()).toBeTruthy();
    const body = (await getResponse.json()) as { id?: string; name?: string };
    expect(body.id).toBe(locationId);
  });

  test("should return 404 for non-existent location", async ({ request }) => {
    const response = await request.get("/api/locations/non-existent-id", {
      headers: { Cookie: `connect.sid=${authCookie}` },
    });

    expect(response.status()).toBe(404);
  });

  test("should update location name", async ({ request }) => {
    // Create a location
    const createResponse = await request.post("/api/locations", {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: `Update Test ${Date.now()}`,
        type: "SHELTER",
        description: "Original description",
      },
    });

    const createBody = (await createResponse.json()) as { id?: string };
    const locationId = createBody.id;

    // Update the location
    const updateResponse = await request.patch(`/api/locations/${locationId}`, {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: `Updated Name ${Date.now()}`,
        description: "Updated description",
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const body = (await updateResponse.json()) as {
      id?: string;
      name?: string;
      description?: string;
    };
    expect(body.name).toContain("Updated Name");
    expect(body.description).toBe("Updated description");
  });

  test("should update location status", async ({ request }) => {
    // Create a location
    const createResponse = await request.post("/api/locations", {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: `Status Test ${Date.now()}`,
        type: "SHELTER",
      },
    });

    const createBody = (await createResponse.json()) as { id?: string };
    const locationId = createBody.id;

    // Update status to INACTIVE
    const updateResponse = await request.patch(`/api/locations/${locationId}`, {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        status: "INACTIVE",
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const body = (await updateResponse.json()) as { status?: string };
    expect(body.status).toBe("INACTIVE");
  });

  test("should reject update with duplicate name", async ({ request }) => {
    const timestamp = Date.now();

    // Create two locations
    const loc1Response = await request.post("/api/locations", {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: `Loc 1 ${timestamp}`,
        type: "SHELTER",
      },
    });
    const loc1Body = (await loc1Response.json()) as { id?: string };
    const loc1Id = loc1Body.id;

    const loc2Response = await request.post("/api/locations", {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: `Loc 2 ${timestamp}`,
        type: "CLINIC",
      },
    });
    const loc2Body = (await loc2Response.json()) as { id?: string };
    const loc2Id = loc2Body.id;

    // Try to update loc2 with loc1's name
    const updateResponse = await request.patch(`/api/locations/${loc2Id}`, {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: `Loc 1 ${timestamp}`,
      },
    });

    expect(updateResponse.status()).toBe(409);
  });

  test("should archive location (soft delete)", async ({ request }) => {
    // Create a location
    const createResponse = await request.post("/api/locations", {
      headers: { Cookie: `connect.sid=${authCookie}` },
      data: {
        name: `Archive Test ${Date.now()}`,
        type: "SHELTER",
      },
    });

    const createBody = (await createResponse.json()) as { id?: string };
    const locationId = createBody.id;

    // Archive the location
    const deleteResponse = await request.delete(`/api/locations/${locationId}`, {
      headers: { Cookie: `connect.sid=${authCookie}` },
    });

    expect(deleteResponse.status()).toBe(204);

    // Verify it's archived (status changed to ARCHIVED)
    const getResponse = await request.get(`/api/locations/${locationId}`, {
      headers: { Cookie: `connect.sid=${authCookie}` },
    });

    expect(getResponse.ok()).toBeTruthy();
    const body = (await getResponse.json()) as { status?: string };
    expect(body.status).toBe("ARCHIVED");
  });

  test("should require authentication for location endpoints", async ({ request }) => {
    const response = await request.get("/api/locations");
    expect(response.status()).toBe(401);
  });
});
