import { ApiError } from "@spring/api-client";
import { UserRole } from "@spring/shared";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, Card, ErrorAlert, Field, Input } from "@/components";
import { client, setSession } from "../session";

export function LoginPage() {
  const [email, setEmail] = useState("admin@gwgwgroup.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const session = await client.login({ email, password });
      if (session.user.role !== UserRole.ADMIN) {
        setError("沒有權限。");
        return;
      }
      setSession({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: session.user });
      toast.success("已登入。");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "登入資料不正確。");
    } finally {
      setPending(false);
    }
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
          <Field label="電郵">
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="username"
              required
              className="w-full"
            />
          </Field>
          <Field label="密碼">
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              required
              className="w-full"
            />
          </Field>
          <ErrorAlert message={error} />
          <Button type="submit" disabled={pending}>
            {pending ? "登入中…" : "登入"}
          </Button>
        </Card>
      </form>
    </div>
  );
}
