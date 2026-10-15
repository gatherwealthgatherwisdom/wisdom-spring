import { create } from "zustand";

export const INBOX_QUERY = ["inbox"] as const;

type FillHandler = (code: string) => void;

let fillHandler: FillHandler | null = null;

export const useOtpPrompt = create<{
  code: string | null;
  noticeId?: string;
  canFill: boolean;
  show: (code: string, noticeId?: string) => void;
  dismiss: () => void;
  setCanFill: (canFill: boolean) => void;
}>((set) => ({
  code: null,
  noticeId: undefined,
  canFill: false,
  show(code, noticeId) {
    if (!/^\d{6}$/.test(code)) return;
    set({ code, noticeId });
  },
  dismiss() {
    set({ code: null, noticeId: undefined });
  },
  setCanFill(canFill) {
    set({ canFill });
  },
}));

export function setOtpFillHandler(handler: FillHandler | null): () => void {
  fillHandler = handler;
  useOtpPrompt.getState().setCanFill(Boolean(handler));
  return () => {
    if (fillHandler === handler) {
      fillHandler = null;
      useOtpPrompt.getState().setCanFill(false);
    }
  };
}

export function fillOtp(code: string): boolean {
  if (!fillHandler) return false;
  fillHandler(code);
  return true;
}

const seen = new Set<string>();

export function otpCodeOf(input: {
  kind?: string;
  body?: string;
  data?: Record<string, unknown> | null;
}): string | null {
  if (input.kind && input.kind !== "otp") return null;
  const dataCode = input.data?.code;
  if (typeof dataCode === "string" && /^\d{6}$/.test(dataCode)) return dataCode;
  const match = input.body?.match(/\d{6}/);
  return match?.[0] ?? null;
}

export function maybeShowLiveOtp(
  items: Array<{
    id: string;
    kind: string;
    body: string;
    data: Record<string, unknown> | null;
    expired: boolean;
    readAt: string | null;
  }>,
): void {
  const live = items.find((item) => item.kind === "otp" && !item.expired && item.readAt == null);
  if (!live) return;
  if (seen.has(live.id)) return;
  const code = otpCodeOf(live);
  if (!code) return;
  seen.add(live.id);
  useOtpPrompt.getState().show(code, live.id);
}

export function markOtpSeen(noticeId?: string): void {
  if (noticeId) seen.add(noticeId);
}
