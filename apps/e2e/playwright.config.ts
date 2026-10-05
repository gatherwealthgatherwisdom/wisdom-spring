import { defineConfig, devices } from "@playwright/test";

const chrome = { channel: "chrome" as const };

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  globalSetup: "./src/global-setup.ts",
  use: {
    ...chrome,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "admin",
      testMatch: /admin\..*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...chrome,
        baseURL: "http://127.0.0.1:5173",
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile",
      testMatch: /mobile\..*\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        ...chrome,
        isMobile: true,
        hasTouch: true,
        baseURL: "http://127.0.0.1:8081",
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
