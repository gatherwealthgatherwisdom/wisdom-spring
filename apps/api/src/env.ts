import { config } from "dotenv";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
config({ path: resolve(root, ".env") });

function secret(name: string, fallback: string): string {
  const value = process.env[name];
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} is required`);
  }
  return fallback;
}

function flag(name: string, fallback: boolean): boolean {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? "mysql://spring:spring@127.0.0.1:3306/spring",
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  jwtAccessSecret: secret("JWT_ACCESS_SECRET", "dev-access-secret-change"),
  jwtRefreshSecret: secret("JWT_REFRESH_SECRET", "dev-refresh-secret-change"),
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  adminEmail: (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase(),
  appOriginAdmin: process.env.APP_ORIGIN_ADMIN ?? "http://localhost:5173",
  publicAppUrl: process.env.PUBLIC_APP_URL ?? "https://gwgwgroup.com",
  ignoreProviders: (process.env.OPENROUTER_IGNORE_PROVIDERS ?? "openai,anthropic")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0),
  probeAssumesHkEgress: flag("PROBE_ASSUMES_HK_EGRESS", false),
  workerEmbedded: flag("WORKER_EMBEDDED", true),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  appleClientId: process.env.APPLE_CLIENT_ID ?? "",
};

export type AppEnv = typeof env;
