export const LOOK_PROMPT = "請睇呢張圖，用繁體中文講你見到乜。";
export const LOOK_TITLE = "睇圖";
export const FILE_PROMPT = "請用繁體中文講呢份文件嘅重點。";
export const FILE_TITLE = "文件";
export const FILE_LATER_COPY = "檔案下一輪先接。";
export const IMAGE_TOO_LARGE_COPY = "圖片最大 4MB。";
export const IMAGE_FORMAT_COPY = "圖片格式不正確。";
export const IMAGE_MODE_NO_UPLOAD_COPY = "圖像生成唔支援上圖。";

export const UPLOAD_MIMES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type UploadMime = (typeof UPLOAD_MIMES)[number];

export function isUploadMime(value: string): value is UploadMime {
  return (UPLOAD_MIMES as readonly string[]).includes(value);
}

export function isImageMime(value: string): boolean {
  return value === "image/jpeg" || value === "image/png" || value === "image/webp";
}

export function isPdfMime(value: string): boolean {
  return value === "application/pdf";
}

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

export function assetIdsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && ULID.test(item) && !ids.includes(item)) ids.push(item);
  }
  return ids;
}
