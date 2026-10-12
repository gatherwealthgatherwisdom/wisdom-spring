import { FILE_TITLE, LOOK_TITLE } from "../constants/uploads";

const TITLE_MAX = 20;

export function conversationTitleFrom(
  text: string,
  options: { hasImage?: boolean; hasPdf?: boolean } = {},
): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (collapsed) return collapsed.slice(0, TITLE_MAX);
  if (options.hasPdf) return FILE_TITLE;
  if (options.hasImage) return LOOK_TITLE;
  return "";
}

export function conversationLabel(
  item: { title?: string | null; preview?: string | null } | null | undefined,
  fallback: string,
): string {
  const title = item?.title?.trim();
  if (title) return title;
  const preview = item?.preview?.trim();
  if (preview) return preview;
  return fallback;
}
