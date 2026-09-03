import { FullConfig, request } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  Account,
  TestEnv,
  BACKEND_URL,
  ADMIN_ACCOUNT,
  STAFF_TEST_ACCOUNT,
  ADMIN_TEST_ACCOUNT,
} from "./tests/support/env";
import { cleanupTestData } from "./tests/support/db-cleanup";

const testRuntimeDir = path.resolve(__dirname, ".test-runtime");
const envPath = path.join(testRuntimeDir, "test-env.json");

async function ensureUser(api: Awaited<ReturnType<typeof request.newContext>>, account: Account) {
  const list = await api.get("/admin/users");
  if (!list.ok()) {
    throw new Error(`Could not list users (${list.status()}): ${await list.text()}`);
  }
  const users = (await list.json()) as Array<{ email: string }>;
  if (users.some((user) => user.email === account.email)) {
    return;
  }

  const created = await api.post("/admin/users", {
    data: {
      email: account.email,
      fullName: account.fullName,
      role: account.role,
      status: account.status,
      password: account.password,
      isTest: account.isTest,
    },
  });
  if (created.status() !== 201) {
    throw new Error(
      `Could not register test user ${account.email} (${created.status()}): ${await created.text()}`,
    );
  }
  console.log(`Global setup: registered test user ${account.email} (${account.role})`);
}

export default async function globalSetup(_config: FullConfig) {
  fs.mkdirSync(testRuntimeDir, { recursive: true });

  // Remove leftover isTest data from previous (possibly interrupted) runs so the
  // app's first-page lists always show this run's freshly created entities.
  await cleanupTestData();

  const api = await request.newContext({ baseURL: BACKEND_URL });
  const runId = Date.now();

  const adminLogin = await api.post("/auth/login", {
    data: { email: ADMIN_ACCOUNT.email, password: ADMIN_ACCOUNT.password },
  });
  if (adminLogin.status() !== 201) {
    throw new Error(
      `Admin login failed (${adminLogin.status()}). Ensure the backend is running and seeded: ${ADMIN_ACCOUNT.email}. Body: ${await adminLogin.text()}`,
    );
  }

  for (const account of [STAFF_TEST_ACCOUNT, ADMIN_TEST_ACCOUNT]) {
    await ensureUser(api, account);
  }

  for (const account of [STAFF_TEST_ACCOUNT, ADMIN_TEST_ACCOUNT]) {
    const login = await api.post("/auth/login", {
      data: { email: account.email, password: account.password },
    });
    if (login.status() !== 201) {
      throw new Error(
        `Registered test user ${account.email} cannot log in (${login.status()}): ${await login.text()}`,
      );
    }
  }

  const env: TestEnv = {
    runId,
    admin: ADMIN_ACCOUNT,
    staffTestUser: STAFF_TEST_ACCOUNT,
    adminTestUser: ADMIN_TEST_ACCOUNT,
  };
  fs.writeFileSync(envPath, JSON.stringify(env, null, 2));

  await api.dispose();
}