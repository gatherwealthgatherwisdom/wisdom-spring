import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { env } from "../../../env";
import type { GeneratedImagePart } from "../../catalog/infra/openrouter.client";

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
const EXTS = ["png", "jpg", "jpeg", "webp"] as const;

function extOf(mediaType: string | undefined): (typeof EXTS)[number] {
  if (mediaType === "image/jpeg") return "jpg";
  if (mediaType === "image/webp") return "webp";
  return "png";
}

function mimeOf(ext: string): string {
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "image/png";
}

export function isGeneratedId(id: string): boolean {
  return ULID.test(id);
}

export async function persistGeneratedImage(messageId: string, image: GeneratedImagePart): Promise<string> {
  if (image.url && /^https?:\/\//i.test(image.url)) return image.url;
  const bytes = bytesOf(image);
  if (!bytes) throw new Error("image missing");
  await mkdir(env.generatedDir, { recursive: true });
  const ext = extOf(image.mediaType);
  await writeFile(join(env.generatedDir, `${messageId}.${ext}`), bytes);
  return `/v1/generated/${messageId}`;
}

export async function readGeneratedImage(messageId: string): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!isGeneratedId(messageId)) return null;
  for (const ext of EXTS) {
    const path = join(env.generatedDir, `${messageId}.${ext}`);
    if (!existsSync(path)) continue;
    return { bytes: await readFile(path), mime: mimeOf(ext) };
  }
  return null;
}

function bytesOf(image: GeneratedImagePart): Buffer | null {
  if (image.b64) return Buffer.from(image.b64, "base64");
  if (image.url?.startsWith("data:")) {
    const match = image.url.match(/^data:image\/[\w+.-]+;base64,(.+)$/);
    if (match?.[1]) return Buffer.from(match[1], "base64");
  }
  return null;
}
