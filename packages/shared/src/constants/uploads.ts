import { Locale, parseAppLocale } from "../enums/locale";
import { toSimplified } from "../lib/zh-hans";

export const LOOK_PROMPT = "請看這張圖，用香港書面語說明你所見。";
export const LOOK_TITLE = "看圖";
export const FILE_PROMPT = "請用香港書面語說明這份文件的重點。";
export const FILE_TITLE = "文件";
export const FILE_LATER_COPY = "檔案功能稍後提供。";
export const IMAGE_TOO_LARGE_COPY = "圖片最大 4MB。";
export const IMAGE_FORMAT_COPY = "圖片格式不正確。";
export const IMAGE_MODE_NO_UPLOAD_COPY = "圖像生成不支援上載圖片。";
export const FEATURE_OFF_COPY = "此功能暫時關閉。";

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

export function mediaPromptFor(kind: "look" | "file", locale: string, body: string): string {
  const app = parseAppLocale(locale);
  if (app === Locale.EN) {
    return kind === "file"
      ? "Please summarise the key points of this document."
      : "Please look at this image and describe what you see.";
  }
  return app === Locale.ZH_CN ? toSimplified(body) : body;
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
