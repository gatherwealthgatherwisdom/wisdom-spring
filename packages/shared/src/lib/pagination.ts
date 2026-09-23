export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string): string {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeCursor(parts: Record<string, string>): string {
  return toBase64Url(JSON.stringify(parts));
}

export function decodeCursor(cursor: string): Record<string, string> | null {
  try {
    const value: unknown = JSON.parse(fromBase64Url(cursor));
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, item] of Object.entries(record)) {
      if (typeof item === "string") out[key] = item;
    }
    return out;
  } catch {
    return null;
  }
}
