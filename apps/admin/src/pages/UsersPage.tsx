import { ApiError } from "@spring/api-client";
import { PlanTier, UserRole, UserStatus, microsToUsd, type AdminUpdateUserRequest, type AdminUserRow } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { client } from "../session";

export function UsersPage() {
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["admin-users", q], queryFn: () => client.adminUsers(q || undefined) });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminUpdateUserRequest }) => client.adminUpdateUser(id, body),
    onSuccess: () => {
      setError("");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "更新失敗。"),
  });

  return (
    <section>
      <h1>用戶</h1>
      <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="搜尋電郵、電話或名稱" />
      {error ? <p className="error">{error}</p> : null}
      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>電郵</th>
              <th>電話</th>
              <th>名稱</th>
              <th>註冊</th>
              <th>試用</th>
              <th>本月</th>
              <th>角色</th>
              <th>計劃</th>
              <th>狀態</th>
              <th></th>
              <th>詳情</th>
            </tr>
          </thead>
          <tbody>
            {(users.data?.items ?? []).map((user) => (
              <UserRow key={user.id} user={user} onChange={(body) => update.mutate({ id: user.id, body })} />
            ))}
          </tbody>
        </table>
        {users.isLoading ? <p className="muted">載入中…</p> : null}
      </div>
    </section>
  );
}

function UserRow({
  user,
  onChange,
}: {
  user: AdminUserRow;
  onChange: (body: AdminUpdateUserRequest) => void;
}) {
  return (
    <tr>
      <td>{user.email ?? "—"}</td>
      <td>{user.phone ?? "—"}</td>
      <td>{user.displayName ?? "—"}</td>
      <td>{user.registered ? "已註冊" : "訪客"}</td>
      <td>
        {user.guestUses}/{user.guestLimit}{" "}
        <button className="btn ghost" type="button" onClick={() => onChange({ resetGuestUses: true })}>
          重置
        </button>
      </td>
      <td>
        {user.monthRequests} · ${microsToUsd(user.monthCostUsdMicros)}
      </td>
      <td>
        <select value={user.role} onChange={(event) => onChange({ role: event.target.value as UserRole })}>
          <option value={UserRole.USER}>USER</option>
          <option value={UserRole.ADMIN}>ADMIN</option>
        </select>
      </td>
      <td>
        <select value={user.planTier} onChange={(event) => onChange({ planTier: event.target.value as PlanTier })}>
          <option value={PlanTier.FREE}>FREE</option>
          <option value={PlanTier.PLUS}>PLUS</option>
          <option value={PlanTier.INTERNAL}>INTERNAL</option>
        </select>
      </td>
      <td>{user.status}</td>
      <td>
        {user.status === UserStatus.SUSPENDED ? (
          <button className="btn ghost" type="button" onClick={() => onChange({ status: UserStatus.ACTIVE })}>
            恢復
          </button>
        ) : user.status === UserStatus.DELETED ? (
          "—"
        ) : (
          <button className="btn danger" type="button" onClick={() => onChange({ status: UserStatus.SUSPENDED })}>
            暫停
          </button>
        )}
      </td>
      <td>
        <Link to={`/users/${user.id}`}>詳情</Link>
      </td>
    </tr>
  );
}
