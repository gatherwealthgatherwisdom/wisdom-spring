import { Converter } from "opencc-js";
import { Locale, parseAppLocale } from "../enums/locale";

const toCn = Converter({ from: "hk", to: "cn" });

/** Hong Kong written Chinese in simplified characters. Does not rewrite HK vocabulary. */
export function toSimplified(text: string): string {
  if (!text) return text;
  return toCn(text);
}

export function labelFor(item: { zh: string; en: string }, locale: string): string {
  const app = parseAppLocale(locale);
  if (app === Locale.EN) return item.en;
  return app === Locale.ZH_CN ? toSimplified(item.zh) : item.zh;
}