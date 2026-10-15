export const INBOX_KINDS = [
  "otp",
  "admin",
  "quota_low",
  "quota_exhausted",
  "monthly_cost",
  "generation_done",
] as const;

export type InboxKind = (typeof INBOX_KINDS)[number];

export const INBOX_OTP_TTL_MS = 5 * 60 * 1000;
export const INBOX_FANOUT_BATCH = 100;

export const ADMIN_OTP_NEED_APP = "請先在手機開啟智泉並允許通知。";

const ADMIN_SITE_FALLBACKS = ["http://localhost:5173", "http://127.0.0.1:5173"] as const;

export function isInboxKind(value: string): value is InboxKind {
  return (INBOX_KINDS as readonly string[]).includes(value);
}

export function isAdminSiteOrigin(origin: string | string[] | undefined, appOriginAdmin: string): boolean {
  const raw = Array.isArray(origin) ? origin[0] : origin;
  if (!raw) return false;
  const normalized = raw.trim().replace(/\/$/, "");
  if (!normalized) return false;
  const allowed = new Set(
    [appOriginAdmin, ...ADMIN_SITE_FALLBACKS].map((item) => item.trim().replace(/\/$/, "")).filter(Boolean),
  );
  return allowed.has(normalized);
}

export type InboxNoticeRow = {
  id: string;
  kind: string;
  title: string;
  body: string;
  data: unknown;
  createdAt: Date;
  readAt: Date | null;
  expiresAt: Date | null;
};

type PresentedInboxNotice = {
  id: string;
  kind: InboxKind;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
  expiresAt: string | null;
  expired: boolean;
};

function asRecord(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return { ...(data as Record<string, unknown>) };
}

export function presentInboxNotice(row: InboxNoticeRow, now = new Date()): PresentedInboxNotice {
  const expired = row.expiresAt != null && row.expiresAt.getTime() <= now.getTime();
  const hideCode = row.kind === "otp" && (expired || row.readAt != null);
  const data = asRecord(row.data);
  if (hideCode && data && "code" in data) delete data.code;
  const kind: InboxKind = isInboxKind(row.kind) ? row.kind : "admin";
  return {
    id: row.id,
    kind,
    title: row.title,
    body: hideCode ? row.body.replace(/\d{6}/g, "••••••") : row.body,
    data,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    expired,
  };
}
