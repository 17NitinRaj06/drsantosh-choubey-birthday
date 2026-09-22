import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "wishes-layout.spec.ts",
  timeout: 120_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
  },
  webServer: [
    {
      command: "npx tsx src/index.ts",
      cwd: "./realtime-service",
      port: 3001,
      timeout: 30_000,
      reuseExistingServer: true,
      env: {
        PORT: "3001",
        MONGODB_URI:
          process.env.MONGODB_URI || "mongodb+srv://test:test@nonexistent.invalid/wishes_test",
        MONGODB_DB: "wishes_test",
        ADMIN_PASSWORD: "test-admin-pass",
        ALLOWED_ORIGIN: "http://localhost:3000",
      },
    },
    {
      command: "npx next dev --port 3000",
      cwd: "./frontend",
      port: 3000,
      timeout: 120_000,
      reuseExistingServer: true,
    },
  ],
});
