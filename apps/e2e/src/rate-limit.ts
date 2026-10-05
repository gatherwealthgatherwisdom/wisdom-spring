import { execFileSync } from "node:child_process";

export function clearPhoneRateLimits(): void {
  const keys = execFileSync("redis-cli", ["--raw", "keys", "spring-rl:*"], { encoding: "utf8" })
    .split("\n")
    .map((key) => key.trim())
    .filter(Boolean);
  if (keys.length === 0) return;
  execFileSync("redis-cli", ["del", ...keys]);
}
