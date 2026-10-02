import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    isolate: false,
    globals: true,
    environment: "node",
    include: ["src/**/*.spec.ts"],
    globalSetup: ["./src/test-utils/global-setup.ts"],
    testTimeout: 120_000,
    coverage: {
      include: ["src/**/*.{ts,js}"],
      reportsDirectory: "../coverage",
    },
    alias: {
      "@": `${import.meta.dirname}/src`,
    },
  },
});
