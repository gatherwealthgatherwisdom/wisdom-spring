import { ApiError } from "@spring/api-client";
import { microsToUsd } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { client } from "../session";

export function UserDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [bonus, setBonus] = useState("0");
  const [error, setError] = useState("");
  const detail = useQuery({ queryKey: ["admin-user", id], queryFn: () => client.adminUser(id), enabled: Boolean(id) });
  const threads = useQuery({
    queryKey: ["admin-user-conversations", id],
    queryFn: () => client.adminUserConversations(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (detail.data) setBonus(String(detail.data.user.bonusDailyMessages));
  }, [detail.data]);

  const update = useMutation({
    mutationFn: (bonusDailyMessages: number) => client.adminUpdateUser(id, { bonusDailyMessages }),
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "更新失敗。"),
  });

  const data = detail.data;
  return (
    <section>
      <p className="note">
        <Link to="/users">用戶</Link>
      </p>
      <h1>用戶詳情</h1>
      {error ? <p className="error">{error}</p> : null}
      {detail.isLoading ? <p className="muted">載入中…</p> : null}
      {data ? (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <p>
              {data.user.email ?? "—"} · {data.user.phone ?? "—"} · {data.user.displayName ?? "—"}
            </p>
            <p className="muted">
              {data.user.registered ? "已註冊" : "訪客"} · {data.user.planTier} · {data.user.status}
            </p>
            <p>
              今日 {data.quota.dailyUsed} / {data.quota.dailyLimit} · 本月 {data.monthUsage.requests} 次 · $
              {microsToUsd(data.monthUsage.costUsdMicros)}
            </p>
            <p>
              讚 {data.thumbs.up} · 踩 {data.thumbs.down}
            </p>
            <div className="row" style={{ marginTop: 12 }}>
              <label className="row">
                <span className="muted">額外每日次數</span>
                <input type="number" min={0} max={10000} value={bonus} onChange={(event) => setBonus(event.target.value)} />
              </label>
              <button
                className="btn"
                type="button"
                disabled={update.isPending}
                onClick={() => update.mutate(Number(bonus))}
              >
                儲存
              </button>
            </div>
          </div>
          <div className="card">
            <h2>對話</h2>
            <table>
              <thead>
                <tr>
                  <th>標題</th>
                  <th>mode</th>
                  <th>狀態</th>
                  <th>最後訊息</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(threads.data?.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>{item.title ?? "—"}</td>
                    <td>{item.mode}</td>
                    <td>{item.status}</td>
                    <td>{item.lastMessageAt.slice(0, 16).replace("T", " ")}</td>
                    <td>
                      <Link to={`/users/${id}/c/${item.id}`}>訊息</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {threads.isLoading ? <p className="muted">載入中…</p> : null}
            {(threads.data?.items ?? []).length === 0 && !threads.isLoading ? <p className="muted">未有對話。</p> : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

export function UserThreadPage() {
  const { id = "", conversationId = "" } = useParams();
  const thread = useQuery({
    queryKey: ["admin-conversation", conversationId],
    queryFn: () => client.adminConversation(conversationId),
    enabled: Boolean(conversationId),
  });
  const data = thread.data;
  return (
    <section>
      <p className="note">
        <Link to={`/users/${id}`}>用戶詳情</Link>
      </p>
      <h1>{data?.conversation.title ?? "對話"}</h1>
      {thread.isLoading ? <p className="muted">載入中…</p> : null}
      {data ? (
        <div className="card">
          <p className="muted">
            {data.conversation.mode} · {data.conversation.status}
          </p>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {data.messages.map((message) => (
              <div key={message.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
                <p className="muted">
                  {message.role} · {message.status}
                  {message.servedModel ? ` · ${message.servedModel}` : ""}
                  {message.feedback ? ` · ${message.feedback}` : ""}
                  {message.costUsdMicros !== "0" ? ` · $${microsToUsd(message.costUsdMicros)}` : ""}
                </p>
                <p style={{ whiteSpace: "pre-wrap" }}>{message.content || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
