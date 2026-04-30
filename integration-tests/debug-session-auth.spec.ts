import { expect, test } from "@playwright/test";

const adminEmail = process.env.INTEGRATION_ADMIN_EMAIL ?? "admin@shelter.local";
const adminPassword = process.env.INTEGRATION_ADMIN_PASSWORD ?? "admin12345";

test("debug: check session auth flow", async ({ request }) => {
  // Step 1: Login
  console.log("\n=== Step 1: Login ===");
  const loginResponse = await request.post("/auth/login", {
    data: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  console.log("Login status:", loginResponse.status());
  const setCookieHeader = loginResponse.headers()["set-cookie"];
  console.log("Set-Cookie header:", setCookieHeader);
  
  const loginBody = await loginResponse.json();
  console.log("Login response body:", loginBody);

  // Extract session cookie
  let authCookie = "";
  if (setCookieHeader) {
    const cookieMatch = setCookieHeader.match(/connect\.sid=([^;]+)/);
    if (cookieMatch) {
      authCookie = cookieMatch[1];
      console.log("Extracted cookie:", authCookie);
    }
  }

  // Step 2: Try to get /auth/me with cookie
  console.log("\n=== Step 2: GET /auth/me with cookie ===");
  const meResponse = await request.get("/auth/me", {
    headers: { Cookie: `connect.sid=${authCookie}` },
  });

  console.log("/auth/me status:", meResponse.status());
  const meBody = await meResponse.json();
  console.log("/auth/me response:", meBody);

  // Step 3: Try to create location
  console.log("\n=== Step 3: POST /api/locations with cookie ===");
  const createResponse = await request.post("/api/locations", {
    headers: { Cookie: `connect.sid=${authCookie}` },
    data: {
      name: "Test Location",
      type: "SHELTER",
      description: "Test description",
    },
  });

  console.log("Create location status:", createResponse.status());
  console.log("Create location response headers:", createResponse.headers());
  const createBody = await createResponse.json();
  console.log("Create location response body:", JSON.stringify(createBody, null, 2));

  expect(true).toBe(true); // Dummy assertion
});
