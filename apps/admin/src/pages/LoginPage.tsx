import { ApiError } from "@spring/api-client";
import { UserRole } from "@spring/shared";
import { useState, type FormEvent } from "react";
import { client, setSession } from "../session";

export function LoginPage() {
  const [email, setEmail] = useState("admin@gwgwgroup.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const session = await client.login({ email, password });
      if (session.user.role !== UserRole.ADMIN) {
        setError("沒有權限。");
        return;
      }
      setSession({ accessToken: session.accessToken, refreshToken: session.refreshToken, user: session.user });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "登入資料不正確。");
    }
  }

  return (
    <div className="login">
      <form className="card" onSubmit={onSubmit}>
        <div className="brand">
          智泉
          <small>ADMIN · GWGW</small>
        </div>
        <p className="muted">中盈紫達集團 · Gather Wealth Gather Wisdom Group</p>
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" required />
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" type="submit">登入</button>
      </form>
    </div>
  );
}
