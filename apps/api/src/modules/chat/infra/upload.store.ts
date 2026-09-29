import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { env } from "../../../env";
import type { UploadMime } from "@spring/shared";

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
const EXTS = ["png", "jpg", "jpeg", "webp"] as const;

export function isUploadId(id: string): boolean {
  return ULID.test(id);
}

export function extOfMime(mime: UploadMime): "jpg" | "png" | "webp" {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

function mimeOf(ext: string): string {
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "image/png";
}

export function mimeFromMagic(bytes: Buffer, claimed: string): UploadMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return claimed === "image/jpeg" ? "image/jpeg" : null;
  }
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return claimed === "image/png" ? "image/png" : null;
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return claimed === "image/webp" ? "image/webp" : null;
  }
  return null;
}

export async function persistUpload(id: string, mime: UploadMime, bytes: Buffer): Promise<void> {
  await mkdir(env.uploadsDir, { recursive: true });
  await writeFile(join(env.uploadsDir, `${id}.${extOfMime(mime)}`), bytes);
}

export async function readUpload(id: string): Promise<{ bytes: Buffer; mime: string } | null> {
  if (!isUploadId(id)) return null;
  for (const ext of EXTS) {
    const path = join(env.uploadsDir, `${id}.${ext}`);
    if (!existsSync(path)) continue;
    return { bytes: await readFile(path), mime: mimeOf(ext) };
  }
  return null;
}

export async function removeUpload(id: string): Promise<void> {
  for (const ext of EXTS) {
    const path = join(env.uploadsDir, `${id}.${ext}`);
    if (!existsSync(path)) continue;
    await unlink(path).catch(() => undefined);
  }
}
