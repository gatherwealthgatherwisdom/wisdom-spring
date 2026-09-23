import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

config({ path: resolve(import.meta.dirname, "../../.env") });

const databaseUrl = process.env.TEST_DATABASE_URL ?? "mysql://spring:spring@127.0.0.1:3306/spring_test";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      REDIS_URL: "redis://127.0.0.1:6379",
      JWT_ACCESS_SECRET: "test-access-secret-0001",
      JWT_REFRESH_SECRET: "test-refresh-secret-001",
      ADMIN_EMAIL: "admin@gwgwgroup.com",
      OPENROUTER_API_KEY: "",
      PROBE_ASSUMES_HK_EGRESS: "false",
      WORKER_EMBEDDED: "false",
      APP_ORIGIN_ADMIN: "http://localhost:5173",
      PUBLIC_APP_URL: "https://gwgwgroup.com",
      OPENROUTER_IGNORE_PROVIDERS: "openai,anthropic",
    },
  },
});
