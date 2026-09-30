import { ApiError } from "@spring/api-client";
import type { AdminCopy, UpdateCopyRequest } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { client } from "../session";

type Draft = {
  system: string;
  look: string;
  file: string;
  titleJob: string;
  emptyHero: string;
};

function fromCopy(data: AdminCopy): Draft {
  return {
    system: data.system,
    look: data.look,
    file: data.file,
    titleJob: data.titleJob,
    emptyHero: data.emptyHero.join("\n"),
  };
}

function toPatch(draft: Draft): UpdateCopyRequest {
  return {
    system: draft.system,
    look: draft.look,
    file: draft.file,
    titleJob: draft.titleJob,
    emptyHero: draft.emptyHero
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  };
}

export function CopyPage() {
  const queryClient = useQueryClient();
  const copy = useQuery({ queryKey: ["admin-copy"], queryFn: () => client.adminCopy() });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (copy.data) setDraft(fromCopy(copy.data));
  }, [copy.data]);

  const save = useMutation({
    mutationFn: (body: UpdateCopyRequest) => client.adminUpdateCopy(body),
    onSuccess: async (data) => {
      setError("");
      setDraft(fromCopy(data));
      await queryClient.invalidateQueries({ queryKey: ["admin-copy"] });
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "儲存失敗。"),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    save.mutate(toPatch(draft));
  }

  function set<K extends keyof Draft>(key: K, value: string) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <section>
      <h1>文案</h1>
      <p className="note" style={{ marginTop: -8, marginBottom: 16 }}>
        改完即用。系統提示同睇圖／PDF 空 caption 即時影響生成；建議句會出現喺對話空狀態。
      </p>
      {error ? <p className="error">{error}</p> : null}
      {draft ? (
        <form className="card" onSubmit={onSubmit} style={{ display: "grid", gap: 18, maxWidth: 720 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>系統提示</span>
            <textarea
              rows={10}
              value={draft.system}
              onChange={(event) => set("system", event.target.value)}
              required
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>睇圖空 caption</span>
            <textarea rows={2} value={draft.look} onChange={(event) => set("look", event.target.value)} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>PDF 空 caption</span>
            <textarea rows={2} value={draft.file} onChange={(event) => set("file", event.target.value)} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>對話標題指示</span>
            <textarea
              rows={2}
              value={draft.titleJob}
              onChange={(event) => set("titleJob", event.target.value)}
              required
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>空狀態建議句（一行一句）</span>
            <textarea
              rows={6}
              value={draft.emptyHero}
              onChange={(event) => set("emptyHero", event.target.value)}
              required
            />
          </label>
          <button className="btn" type="submit" disabled={save.isPending}>
            {save.isPending ? "儲存中…" : "儲存"}
          </button>
        </form>
      ) : (
        <p className="muted">載入中…</p>
      )}
    </section>
  );
}