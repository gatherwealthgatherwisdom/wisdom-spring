export function formatWhen(iso: string, locale: "zh-HK" | "en"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return locale === "en" ? "now" : "剛剛";
  if (diff < 3_600_000) {
    const minutes = Math.max(1, Math.floor(diff / 60_000));
    return locale === "en" ? `${minutes}m` : `${minutes} 分鐘前`;
  }
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString(locale === "en" ? "en-HK" : "zh-HK", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(locale === "en" ? "en-CA" : "zh-HK", { month: "short", day: "numeric" });
}
