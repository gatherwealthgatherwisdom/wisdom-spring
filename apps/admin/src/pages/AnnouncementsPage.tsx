import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { client } from "../session";

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const rows = useQuery({ queryKey: ["admin-announcements"], queryFn: () => client.adminAnnouncements() });
  const [bodyZh, setBodyZh] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editZh, setEditZh] = useState("");
  const [editEn, setEditEn] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });

  const create = useMutation({
    mutationFn: () => client.adminCreateAnnouncement({ bodyZh, bodyEn, active: true }),
    onSuccess: async () => {
      setBodyZh("");
      setBodyEn("");
      await refresh();
    },
  });
  const update = useMutation({
    mutationFn: (item: { id: string; bodyZh: string; bodyEn: string; active: boolean }) =>
      client.adminUpdateAnnouncement(item.id, { bodyZh: item.bodyZh, bodyEn: item.bodyEn, active: item.active }),
    onSuccess: async () => {
      setEditingId(null);
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => client.adminDeleteAnnouncement(id),
    onSuccess: () => refresh(),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    create.mutate();
  }

  return (
    <section>
      <h1>公告</h1>
      <form className="card" onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <textarea value={bodyZh} onChange={(event) => setBodyZh(event.target.value)} placeholder="繁體中文" required />
        <textarea value={bodyEn} onChange={(event) => setBodyEn(event.target.value)} placeholder="English" required />
        <button className="btn" type="submit">
          發佈
        </button>
      </form>
      <div className="card">
        {(rows.data?.items ?? []).map((item) => (
          <article key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
            {editingId === item.id ? (
              <div style={{ display: "grid", gap: 10 }}>
                <textarea value={editZh} onChange={(event) => setEditZh(event.target.value)} />
                <textarea value={editEn} onChange={(event) => setEditEn(event.target.value)} />
                <div className="row">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => update.mutate({ id: item.id, bodyZh: editZh, bodyEn: editEn, active: item.active })}
                  >
                    儲存
                  </button>
                  <button className="btn ghost" type="button" onClick={() => setEditingId(null)}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p>{item.bodyZh}</p>
                <p className="muted">{item.bodyEn}</p>
                <div className="row">
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() =>
                      update.mutate({ id: item.id, bodyZh: item.bodyZh, bodyEn: item.bodyEn, active: !item.active })
                    }
                  >
                    {item.active ? "下架" : "上架"}
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditZh(item.bodyZh);
                      setEditEn(item.bodyEn);
                    }}
                  >
                    編輯
                  </button>
                  <button
                    className="btn danger"
                    type="button"
                    onClick={() => {
                      if (window.confirm("刪除呢則公告？")) remove.mutate(item.id);
                    }}
                  >
                    刪除
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
        {rows.isLoading ? <p className="muted">載入中…</p> : null}
      </div>
    </section>
  );
}
