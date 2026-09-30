/** Calendar day in Asia/Hong_Kong as YYYY-MM-DD. */
export function hkDayKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function hkMonthRange(now: Date): { start: Date; end: Date } {
  const day = hkDayKey(now);
  const [yearText, monthText] = day.split("-");
  return hkMonthRangeFromKey(`${yearText}-${monthText}`);
}

/** Hong Kong calendar month `YYYY-MM`. */
export function hkMonthRangeFromKey(month: string): { start: Date; end: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(month.trim());
  if (!match) throw new Error("month");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  if (monthIndex < 1 || monthIndex > 12) throw new Error("month");
  const yearText = String(year);
  const monthText = String(monthIndex).padStart(2, "0");
  const start = new Date(`${yearText}-${monthText}-01T00:00:00+08:00`);
  const nextYear = monthIndex === 12 ? year + 1 : year;
  const nextMonth = monthIndex === 12 ? 1 : monthIndex + 1;
  const nextMonthText = String(nextMonth).padStart(2, "0");
  const end = new Date(`${nextYear}-${nextMonthText}-01T00:00:00+08:00`);
  return { start, end };
}
