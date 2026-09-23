import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { client } from "../session";

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const rows = useQuery({ queryKey: ["admin-announcements"], queryFn: () => client.adminAnnouncements() });
  const [bodyZh, setBodyZh] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const create = useMutation({
    mutationFn: () => client.adminCreateAnnouncement({ bodyZh, bodyEn, active: true }),
    onSuccess: async () => {
      setBodyZh("");
      setBodyEn("");
      await queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    },
  });
  const toggle = useMutation({
    mutationFn: (item: { id: string; bodyZh: string; bodyEn: string; active: boolean }) =>
      client.adminUpdateAnnouncement(item.id, { bodyZh: item.bodyZh, bodyEn: item.bodyEn, active: !item.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-announcements"] }),
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
        <button className="btn" type="submit">發佈</button>
      </form>
      <div className="card">
        {(rows.data?.items ?? []).map((item) => (
          <article key={item.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
            <p>{item.bodyZh}</p>
            <p className="muted">{item.bodyEn}</p>
            <button className="btn ghost" type="button" onClick={() => toggle.mutate(item)}>
              {item.active ? "下架" : "上架"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
