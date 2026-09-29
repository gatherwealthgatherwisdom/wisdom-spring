import { SpringClient } from "@spring/api-client";
import { usePrefs } from "./prefs";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const spring = new SpringClient(
  API_URL,
  () => ({
    accessToken: usePrefs.getState().accessToken,
    refreshToken: usePrefs.getState().refreshToken,
  }),
  (tokens) => usePrefs.getState().applyTokens(tokens),
  "xhr",
);

export function createClientMessageId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (randomUUID) return randomUUID.call(globalThis.crypto);
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const base = API_URL.replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

export function shortModelName(slug: string | null | undefined): string {
  if (!slug) return "";
  const leaf = slug.split("/").pop() ?? slug;
  return leaf.replace(/:free$/, "").replaceAll("-", " ");
}
