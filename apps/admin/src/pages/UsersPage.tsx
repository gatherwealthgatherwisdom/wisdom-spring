import { PlanTier, UserStatus, type UserPublic } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { client } from "../session";

export function UsersPage() {
  const [q, setQ] = useState("");
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["admin-users", q], queryFn: () => client.adminUsers(q || undefined) });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { planTier?: PlanTier; status?: UserStatus.ACTIVE | UserStatus.SUSPENDED } }) =>
      client.adminUpdateUser(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <section>
      <h1>用戶</h1>
      <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="搜尋電郵或名稱" />
      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr><th>電郵</th><th>名稱</th><th>計劃</th><th>狀態</th><th></th></tr>
          </thead>
          <tbody>
            {(users.data?.items ?? []).map((user) => (
              <UserRow key={user.id} user={user} onChange={(body) => update.mutate({ id: user.id, body })} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function UserRow({
  user,
  onChange,
}: {
  user: UserPublic;
  onChange: (body: { planTier?: PlanTier; status?: UserStatus.ACTIVE | UserStatus.SUSPENDED }) => void;
}) {
  return (
    <tr>
      <td>{user.email ?? user.phone ?? "—"}</td>
      <td>{user.displayName ?? "—"}</td>
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
          <button className="btn ghost" type="button" onClick={() => onChange({ status: UserStatus.ACTIVE })}>恢復</button>
        ) : (
          <button className="btn danger" type="button" onClick={() => onChange({ status: UserStatus.SUSPENDED })}>暫停</button>
        )}
      </td>
    </tr>
  );
}
