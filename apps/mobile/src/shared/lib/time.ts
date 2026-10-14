import { Locale, parseAppLocale, toSimplified, type AppLocale } from "@spring/shared";

export function formatWhen(iso: string, locale: AppLocale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const app = parseAppLocale(locale);
  const diff = Date.now() - date.getTime();
  if (app === Locale.EN) {
    if (diff < 60_000) return "now";
    if (diff < 3_600_000) {
      const minutes = Math.max(1, Math.floor(diff / 60_000));
      return `${minutes}m`;
    }
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString("en-HK", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }
  let text: string;
  if (diff < 60_000) text = "剛剛";
  else if (diff < 3_600_000) {
    const minutes = Math.max(1, Math.floor(diff / 60_000));
    text = `${minutes} 分鐘前`;
  } else {
    const tag = app === Locale.ZH_CN ? "zh-CN" : "zh-HK";
    const today = new Date();
    text =
      date.toDateString() === today.toDateString()
        ? date.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString(tag, { month: "short", day: "numeric" });
  }
  return app === Locale.ZH_CN ? toSimplified(text) : text;
}
