import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ADMIN_PHONE, DEV_PHONE_CODE, REVIEW_PHONE } from "@spring/shared";
import { PhoneAuthService } from "../src/modules/auth/phone-auth.service";

function env(nodeEnv: string) {
  return {
    jwtAccessSecret: "dev-access-secret-change",
    adminPhone: DEFAULT_ADMIN_PHONE,
    nodeEnv,
    appOriginAdmin: "https://admin.spring.gwgwgroup-it.com",
  };
}

function service(nodeEnv: string, send: ReturnType<typeof vi.fn>, create: ReturnType<typeof vi.fn>) {
  return new PhoneAuthService(
    { phoneCode: { updateMany: vi.fn(async () => ({ count: 0 })), create } } as never,
    {} as never,
    { send },
    env(nodeEnv),
    {} as never,
  );
}

describe("store-review phone", () => {
  it("issues 123456 in production and never sends SMS", async () => {
    const send = vi.fn();
    const create = vi.fn(async () => ({}));
    const log = { warn: vi.fn() };
    await service("production", send, create).requestCode(REVIEW_PHONE, log);
    expect(send).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    const row = create.mock.calls[0]?.[0]?.data as { phone: string; expiresAt: Date };
    expect(row.phone).toBe(REVIEW_PHONE);
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
    expect(log.warn).toHaveBeenCalledWith({ phone: REVIEW_PHONE, code: DEV_PHONE_CODE }, "review phone verification code");
  });

  it("still SMSes a random production code for other numbers", async () => {
    const send = vi.fn(async () => undefined);
    const create = vi.fn(async () => ({}));
    await service("production", send, create).requestCode("+85291234567", { warn: vi.fn() });
    expect(send).toHaveBeenCalledTimes(1);
    const code = send.mock.calls[0]?.[1] as string;
    expect(code).toMatch(/^\d{6}$/);
    expect(send.mock.calls[0]?.[0]).toBe("+85291234567");
  });
});
