const HK_MOBILE = /^[4-9]\d{7}$/;

export function normalizeHkMobile(input: string): string | null {
  const digits = input.trim().replace(/\D/g, "");
  const local = digits.length === 11 && digits.startsWith("852") ? digits.slice(3) : digits;
  if (!HK_MOBILE.test(local)) return null;
  return `+852${local}`;
}
