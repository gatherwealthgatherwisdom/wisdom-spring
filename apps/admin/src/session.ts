import { SpringClient, type SessionTokens } from "@spring/api-client";
import type { UserPublic } from "@spring/shared";

const KEY = "spring.admin.session";

interface Stored extends SessionTokens {
  user: UserPublic | null;
}

let state: Stored = load();
const listeners = new Set<() => void>();

function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { accessToken: null, refreshToken: null, user: null };
    const parsed = JSON.parse(raw) as Stored;
    return {
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
      user: parsed.user ?? null,
    };
  } catch {
    return { accessToken: null, refreshToken: null, user: null };
  }
}

function emit(): void {
  localStorage.setItem(KEY, JSON.stringify(state));
  for (const listener of listeners) listener();
}

export function getSession(): Stored {
  return state;
}

export function setSession(next: Stored): void {
  state = next;
  emit();
}

export function clearSession(): void {
  state = { accessToken: null, refreshToken: null, user: null };
  emit();
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const client = new SpringClient(
  import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  () => state,
  (tokens) => {
    state = { ...state, ...tokens };
    emit();
  },
);
