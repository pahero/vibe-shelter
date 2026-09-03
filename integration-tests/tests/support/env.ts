import fs from "node:fs";
import path from "node:path";

export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";
export const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:4001";

export type Account = {
  email: string;
  password: string;
  fullName: string;
  role: "admin" | "staff";
  status: "active" | "inactive";
  isTest: boolean;
};

export type TestEnv = {
  runId: number;
  admin: Account;
  staffTestUser: Account;
  adminTestUser: Account;
};

export const ADMIN_ACCOUNT: Account = {
  email: process.env.INTEGRATION_ADMIN_EMAIL ?? "admin@shelter.local",
  password: process.env.INTEGRATION_ADMIN_PASSWORD ?? "admin12345",
  fullName: "Administrator",
  role: "admin",
  status: "active",
  isTest: false,
};

// Persistent, well-known test users. Global setup registers them idempotently
// (and never deletes them), so individual specs can also run on their own from
// the Playwright UI: authentication always works even without a fresh setup.
export const STAFF_TEST_ACCOUNT: Account = {
  email: "e2e-staff@shelter.test",
  password: "E2EStaffPass123!",
  fullName: "E2E Staff Test User",
  role: "staff",
  status: "active",
  isTest: true,
};

export const ADMIN_TEST_ACCOUNT: Account = {
  email: "e2e-admin@shelter.test",
  password: "E2EAdminPass123!",
  fullName: "E2E Admin Test User",
  role: "admin",
  status: "active",
  isTest: true,
};

// Stored OUTSIDE the Playwright output dir (test-results/) which Playwright
// wipes at the start of every run. This way individual specs run from the
// Playwright UI can still read the run id produced by the latest global setup.
const envPath = path.resolve(__dirname, "../../.test-runtime/test-env.json");

function defaultEnv(): TestEnv {
  return {
    runId: Date.now(),
    admin: ADMIN_ACCOUNT,
    staffTestUser: STAFF_TEST_ACCOUNT,
    adminTestUser: ADMIN_TEST_ACCOUNT,
  };
}

export function getTestEnv(): TestEnv {
  if (!fs.existsSync(envPath)) {
    // No global-setup file yet (for example a single spec started from the
    // Playwright UI). The fixed test users are idempotently registered by
    // global setup and persist, so specs can still authenticate, and the
    // fallback run id keeps generated prefixes unique.
    return defaultEnv();
  }
  return JSON.parse(fs.readFileSync(envPath, "utf8")) as TestEnv;
}

export function uniquePrefix(): string {
  return `e2e-${getTestEnv().runId}`;
}

export function uniqueName(label: string): string {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `[${uniquePrefix()}] ${label} ${suffix}`;
}

export function uniqueEmail(label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${uniquePrefix()}-${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@shelter.test`;
}