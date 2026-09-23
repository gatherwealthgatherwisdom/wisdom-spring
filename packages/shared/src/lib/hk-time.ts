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
  const year = Number(yearText);
  const month = Number(monthText);
  const start = new Date(`${yearText}-${monthText}-01T00:00:00+08:00`);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthText = String(nextMonth).padStart(2, "0");
  const end = new Date(`${nextYear}-${nextMonthText}-01T00:00:00+08:00`);
  return { start, end };
}
