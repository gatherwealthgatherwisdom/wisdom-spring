import { mkdirSync } from "node:fs";
import { clearPhoneRateLimits } from "./rate-limit";

const URLS = [
  "http://127.0.0.1:3000/health",
  "http://127.0.0.1:5173/",
  "http://127.0.0.1:8081/",
] as const;

async function waitFor(url: string): Promise<void> {
  let last = "";
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      last = `${response.status}`;
    } catch (caught) {
      last = caught instanceof Error ? caught.message : String(caught);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`dev server not ready: ${url} (${last})`);
}

export default async function globalSetup(): Promise<void> {
  mkdirSync(".auth", { recursive: true });
  clearPhoneRateLimits();
  for (const url of URLS) await waitFor(url);
}
