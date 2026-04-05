import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, ".env") });

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3000";
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3001";
const backendDir = path.resolve(__dirname, "../backend");
const frontendDir = path.resolve(__dirname, "../frontend");
const shouldManageWebServers = process.env.CI === "true" || process.env.MANAGE_WEB_SERVERS === "1";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30_000,
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: shouldManageWebServers
    ? [
        {
          command: "npm run start:dev",
          cwd: backendDir,
          url: `${backendUrl}/health`,
          timeout: 120_000,
          reuseExistingServer: true,
          env: {
            ...process.env,
            PORT: new URL(backendUrl).port,
            FRONTEND_URL: frontendUrl,
          },
        },
        {
          command: "npm run dev",
          cwd: frontendDir,
          url: frontendUrl,
          timeout: 120_000,
          reuseExistingServer: true,
          env: {
            ...process.env,
            NEXT_PUBLIC_API_URL: backendUrl,
          },
        },
      ]
    : undefined,
  projects: [
    {
      name: "backend-api",
      testMatch: /api\/.*\.spec\.ts/,
      use: {
        baseURL: backendUrl,
        trace: "on-first-retry",
      },
    },
    {
      name: "frontend-ui-chromium",
      testMatch: /web\/.*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: frontendUrl,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
      },
    },
  ],
});
