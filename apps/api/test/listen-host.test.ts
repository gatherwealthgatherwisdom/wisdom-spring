import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listenHost, loadDotenv } from "../src/env";

describe("listenHost", () => {
  it("keeps an explicit host", () => {
    expect(listenHost("production", "0.0.0.0")).toBe("0.0.0.0");
    expect(listenHost("development", "127.0.0.1")).toBe("127.0.0.1");
  });

  it("binds loopback in production", () => {
    expect(listenHost("production", undefined)).toBe("127.0.0.1");
    expect(listenHost("production", "  ")).toBe("127.0.0.1");
  });

  it("binds all interfaces outside production", () => {
    expect(listenHost("development", undefined)).toBe("0.0.0.0");
    expect(listenHost("test", "")).toBe("0.0.0.0");
  });
});

describe("loadDotenv", () => {
  const keys = ["SPRING_TEST_DOTENV", "SPRING_TEST_DOTENV_FALLBACK"] as const;

  function restore(): void {
    for (const key of keys) delete process.env[key];
  }

  it("loads .env.production first in production, then fills from .env", () => {
    const dir = mkdtempSync(join(tmpdir(), "spring-dotenv-"));
    writeFileSync(join(dir, ".env.production"), "SPRING_TEST_DOTENV=from-production\n");
    writeFileSync(
      join(dir, ".env"),
      "SPRING_TEST_DOTENV=from-dotenv\nSPRING_TEST_DOTENV_FALLBACK=from-dotenv\n",
    );
    restore();
    loadDotenv(dir, "production");
    expect(process.env.SPRING_TEST_DOTENV).toBe("from-production");
    expect(process.env.SPRING_TEST_DOTENV_FALLBACK).toBe("from-dotenv");
    restore();
  });

  it("skips .env.production outside production", () => {
    const dir = mkdtempSync(join(tmpdir(), "spring-dotenv-"));
    writeFileSync(join(dir, ".env.production"), "SPRING_TEST_DOTENV=from-production\n");
    writeFileSync(join(dir, ".env"), "SPRING_TEST_DOTENV=from-dotenv\n");
    restore();
    loadDotenv(dir, "development");
    expect(process.env.SPRING_TEST_DOTENV).toBe("from-dotenv");
    restore();
  });

  it("does not override existing process.env", () => {
    const dir = mkdtempSync(join(tmpdir(), "spring-dotenv-"));
    writeFileSync(join(dir, ".env.production"), "SPRING_TEST_DOTENV=from-production\n");
    process.env.SPRING_TEST_DOTENV = "from-process";
    loadDotenv(dir, "production");
    expect(process.env.SPRING_TEST_DOTENV).toBe("from-process");
    restore();
  });
});
