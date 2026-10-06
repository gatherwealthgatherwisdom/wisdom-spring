import { defineConfig, devices } from "@playwright/test";

const chrome = { channel: "chrome" as const };
const adminUse = {
  ...devices["Desktop Chrome"],
  ...chrome,
  baseURL: "http://127.0.0.1:5173",
};
const mobileUse = {
  ...devices["Desktop Chrome"],
  ...chrome,
  isMobile: true,
  hasTouch: true,
  baseURL: "http://127.0.0.1:8081",
  viewport: { width: 390, height: 844 },
};

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
      name: "admin-setup",
      testMatch: /admin\.setup\.ts/,
      use: { ...adminUse, viewport: { width: 1280, height: 800 } },
    },
    {
      name: "admin",
      dependencies: ["admin-setup"],
      testMatch: /admin\.(smoke|cms)\.spec\.ts/,
      use: {
        ...adminUse,
        viewport: { width: 1280, height: 800 },
        storageState: ".auth/admin.json",
      },
    },
    {
      name: "admin-phone",
      dependencies: ["admin-setup"],
      testMatch: /admin\.shell\.spec\.ts/,
      use: {
        ...adminUse,
        viewport: { width: 390, height: 844 },
        storageState: ".auth/admin.json",
      },
    },
    {
      name: "admin-anon",
      testMatch: /admin\.auth\.spec\.ts/,
      use: { ...adminUse, viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile-setup",
      testMatch: /mobile\.setup\.ts/,
      use: { ...mobileUse },
    },
    {
      name: "mobile-anon",
      testMatch: /mobile\.(smoke|browse|auth)\.spec\.ts/,
      use: { ...mobileUse },
    },
    {
      name: "mobile",
      dependencies: ["mobile-setup"],
      testMatch: /mobile\.(signed|history)\.spec\.ts/,
      use: { ...mobileUse, storageState: ".auth/mobile.json" },
    },
    {
      name: "mobile-live",
      dependencies: ["mobile-setup"],
      testMatch: /mobile\.live\.spec\.ts/,
      timeout: 180_000,
      use: { ...mobileUse, storageState: ".auth/mobile.json" },
    },
    {
      name: "security-anon",
      testMatch: /security\.anon\.spec\.ts/,
      use: {
        ...adminUse,
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "security-mobile-anon",
      testMatch: /security\.mobile-anon\.spec\.ts/,
      use: { ...mobileUse },
    },
    {
      name: "security-otp",
      testMatch: /security\.otp\.spec\.ts/,
      use: {
        ...adminUse,
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "security-idor",
      testMatch: /security\.idor\.spec\.ts/,
      use: { ...mobileUse },
    },
    {
      name: "security-live",
      testMatch: /security\.live\.spec\.ts/,
      timeout: 180_000,
      use: { ...mobileUse },
    },
  ],
});
