import { ApiError } from "@spring/api-client";
import {
  DEFAULT_ADMIN_PHONE,
  DIALS,
  UserRole,
  formatE164,
  formatLocalDigits,
  localLength,
  normalizeMobile,
  type DialCode,
} from "@spring/shared";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, Card, ErrorAlert, Field, Input, NativeSelect } from "@/components";
import { clearSession, client, setSession } from "../session";

const PLACEHOLDER: Record<DialCode, string> = {
  "852": "9123 4567",
  "853": "6612 3456",
  "86": "138 0013 8000",
};

const DIAL_LABEL: Record<DialCode, string> = {
  "852": "香港 +852",
  "853": "澳門 +853",
  "86": "中國 +86",
};

export function LoginPage() {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [dial, setDial] = useState<DialCode>("852");
  const [digits, setDigits] = useState(() => DEFAULT_ADMIN_PHONE.replace(/^\+852/, ""));
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const pendingRef = useRef(false);
  const maxLocal = localLength(dial);
  const phoneReady = Boolean(normalizeMobile(digits, dial));
  const codeReady = code.length === 6;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function requestCode() {
    const normalized = step === "code" && phone ? phone : normalizeMobile(digits, dial);
    if (!normalized || pendingRef.current) return;
    pendingRef.current = true;
    setError("");
    setPending(true);
    try {
      await client.requestPhoneCode({ phone: normalized });
      setPhone(normalized);
      setCode("");
      setStep("code");
      setCooldown(60);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "無法發送驗證碼。");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  async function verify(nextCode = code) {
    if (pendingRef.current || nextCode.length !== 6) return;
    pendingRef.current = true;
    setError("");
    setPending(true);
    try {
      const session = await client.verifyPhone({ phone, code: nextCode });
      if (session.user.role !== UserRole.ADMIN) {
        setSession({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        });
        await client.logout(true).catch(() => undefined);
        clearSession();
        setError("沒有權限。");
        return;
      }
      setSession({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        user: session.user,
      });
      toast.success("已登入。");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "驗證碼不正確。");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (step === "phone") {
      if (phoneReady) void requestCode();
      return;
    }
    void verify();
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6 py-10">
      <form className="grid w-full max-w-[420px] gap-4" onSubmit={onSubmit}>
        <div>
          <div className="font-serif text-[32px] tracking-[0.08em] text-ink">智泉</div>
          <div className="mt-1 font-serif text-xs tracking-[0.16em] text-pine">ADMIN · GWGW</div>
        </div>
        <Card className="grid gap-4 p-6">
          <p className="text-sm text-muted">中盈紫達集團 · Gather Wealth Gather Wisdom Group</p>
          {step === "phone" ? (
            <Field label="電話" hint="支援香港 +852、澳門 +853、中國 +86。">
              <div className="flex gap-2">
                <NativeSelect
                  value={dial}
                  aria-label="區號"
                  onChange={(event) => {
                    setDial(event.target.value as DialCode);
                    setDigits("");
                    setError("");
                  }}
                >
                  {DIALS.map((item) => (
                    <option key={item.code} value={item.code}>
                      {DIAL_LABEL[item.code]}
                    </option>
                  ))}
                </NativeSelect>
                <Input
                  value={formatLocalDigits(dial, digits)}
                  onChange={(event) => {
                    setDigits(event.target.value.replace(/\D/g, "").slice(0, maxLocal));
                    setError("");
                  }}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder={PLACEHOLDER[dial]}
                  className="w-full"
                  required
                />
              </div>
            </Field>
          ) : (
            <>
              <p className="text-sm text-ink">{formatE164(phone)}</p>
              <Field label="驗證碼">
                <Input
                  value={code}
                  onChange={(event) => {
                    const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                    setCode(next);
                    setError("");
                    if (next.length === 6) void verify(next);
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="w-full text-center text-lg tracking-[0.4em]"
                  autoFocus
                  required
                />
              </Field>
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  className="text-pine hover:underline"
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setError("");
                    setCooldown(0);
                  }}
                >
                  更改號碼
                </button>
                <button
                  type="button"
                  className="text-pine hover:underline disabled:opacity-55"
                  disabled={cooldown > 0 || pending}
                  onClick={() => void requestCode()}
                >
                  {cooldown > 0 ? `${cooldown} 秒後可重發` : "重發驗證碼"}
                </button>
              </div>
            </>
          )}
          <ErrorAlert message={error} />
          <Button
            type="submit"
            size="lg"
            className="w-full rounded-xl"
            disabled={pending || (step === "phone" ? !phoneReady : !codeReady)}
          >
            {pending ? (step === "phone" ? "發送中…" : "登入中…") : step === "phone" ? "發送驗證碼" : "登入"}
          </Button>
        </Card>
      </form>
    </div>
  );
}
