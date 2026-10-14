export enum Locale {
  ZH_HK = "zh-HK",
  ZH_CN = "zh-CN",
  EN = "en",
}

export type AppLocale = `${Locale}`;

export function isAppLocale(value: string): value is AppLocale {
  return value === Locale.ZH_HK || value === Locale.ZH_CN || value === Locale.EN;
}

export function parseAppLocale(value: string | null | undefined): AppLocale {
  if (value === Locale.EN || value === Locale.ZH_CN) return value;
  return Locale.ZH_HK;
}
