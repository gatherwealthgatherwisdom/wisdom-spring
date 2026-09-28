export const DIALS = [
  { code: "852" as const, localLength: 8, pattern: /^[4-9]\d{7}$/ },
  { code: "853" as const, localLength: 8, pattern: /^6\d{7}$/ },
  { code: "86" as const, localLength: 11, pattern: /^1[3-9]\d{9}$/ },
];

export type DialCode = (typeof DIALS)[number]["code"];

function specFor(dial: DialCode) {
  const spec = DIALS.find((item) => item.code === dial);
  if (!spec) throw new Error(dial);
  return spec;
}

export function localLength(dial: DialCode): number {
  return specFor(dial).localLength;
}

export function normalizeMobile(input: string, dial?: DialCode): string | null {
  const digits = input.trim().replace(/\D/g, "");
  if (dial) {
    const spec = specFor(dial);
    let local = digits;
    if (local.startsWith(dial) && local.length === dial.length + spec.localLength) {
      local = local.slice(dial.length);
    }
    if (!spec.pattern.test(local)) return null;
    return `+${dial}${local}`;
  }
  const prefixed = [...DIALS].sort((left, right) => right.code.length - left.code.length);
  for (const spec of prefixed) {
    if (!digits.startsWith(spec.code)) continue;
    const local = digits.slice(spec.code.length);
    if (spec.pattern.test(local)) return `+${spec.code}${local}`;
  }
  if (specFor("86").pattern.test(digits)) return `+86${digits}`;
  if (specFor("852").pattern.test(digits)) return `+852${digits}`;
  return null;
}

export function normalizeHkMobile(input: string): string | null {
  return normalizeMobile(input);
}

export function formatLocalDigits(dial: DialCode, digits: string): string {
  const local = digits.replace(/\D/g, "").slice(0, localLength(dial));
  if (dial === "86") {
    const parts = [local.slice(0, 3), local.slice(3, 7), local.slice(7, 11)].filter(Boolean);
    return parts.join(" ");
  }
  return local.length > 4 ? `${local.slice(0, 4)} ${local.slice(4)}` : local;
}

export function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("852") && digits.length === 11) {
    const local = digits.slice(3);
    return `+852 ${local.slice(0, 4)} ${local.slice(4)}`;
  }
  if (digits.startsWith("853") && digits.length === 11) {
    const local = digits.slice(3);
    return `+853 ${local.slice(0, 4)} ${local.slice(4)}`;
  }
  if (digits.startsWith("86") && digits.length === 13) {
    const local = digits.slice(2);
    return `+86 ${local.slice(0, 3)} ${local.slice(3, 7)} ${local.slice(7)}`;
  }
  return phone.startsWith("+") ? phone : `+${digits}`;
}
