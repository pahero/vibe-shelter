import { FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { cleanupTestData } from "./tests/support/db-cleanup";

const envPath = path.resolve(__dirname, ".test-runtime", "test-env.json");

export default async function globalTeardown(_config: FullConfig) {
  if (fs.existsSync(envPath)) {
    fs.unlinkSync(envPath);
  }

  // Remove the test data this run created (cats/locations and ad hoc users).
  // The fixed test-user fixtures are intentionally kept so individual specs
  // can still be started on their own from the Playwright UI.
  await cleanupTestData();
}