import { ApiError } from "@spring/api-client";
import type { AdminCatalogItem, CatalogKind, CreateCatalogEntryRequest, UpdateCatalogEntryRequest } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { client } from "../session";

type Kind = Extract<CatalogKind, "write" | "image" | "translate">;

const emptyCreate = {
  id: "",
  zh: "",
  en: "",
  blurbZh: "",
  blurbEn: "",
  instruction: "",
  sort: 100,
};

const TABS: Array<{ kind: Kind; label: string }> = [
  { kind: "write", label: "寫作" },
  { kind: "image", label: "圖像" },
  { kind: "translate", label: "翻譯" },
];

export function TemplatesPage() {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<Kind>("write");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminCatalogItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState(emptyCreate);
  const [error, setError] = useState("");

  const rows = useQuery({
    queryKey: ["admin-catalog", kind],
    queryFn: () => client.adminCatalog(kind),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-catalog"] });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCatalogEntryRequest }) =>
      client.adminUpdateCatalog(kind, id, body),
    onSuccess: async () => {
      setError("");
      setEditingId(null);
      setDraft(null);
      await refresh();
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "更新失敗。"),
  });

  const add = useMutation({
    mutationFn: (body: CreateCatalogEntryRequest) => client.adminCreateCatalog(body),
    onSuccess: async () => {
      setError("");
      setCreateOpen(false);
      setCreate(emptyCreate);
      await refresh();
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "新增失敗。"),
  });

  function startEdit(item: AdminCatalogItem) {
    setEditingId(item.id);
    setDraft({ ...item });
  }

  function saveEdit() {
    if (!draft) return;
    update.mutate({
      id: draft.id,
      body: {
        zh: draft.zh,
        en: draft.en,
        blurbZh: draft.blurbZh,
        blurbEn: draft.blurbEn,
        live: draft.live,
        sort: draft.sort,
        instruction: kind === "translate" ? undefined : (draft.instruction ?? null),
      },
    });
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    const blurbZh = create.blurbZh.trim() || create.zh;
    const blurbEn = create.blurbEn.trim() || create.en;
    add.mutate({
      kind,
      id: create.id,
      zh: create.zh,
      en: create.en,
      blurbZh,
      blurbEn,
      live: true,
      sort: create.sort,
      ...(kind === "write" ? { mode: "write" as const, templateId: create.id } : {}),
      ...(kind === "image" ? { mode: "image" as const, imageStyle: create.id } : {}),
      ...(kind === "translate" ? { mode: "translate" as const } : {}),
      ...(kind !== "translate" && create.instruction ? { instruction: create.instruction } : {}),
    });
  }

  const instructionLabel = kind === "image" ? "風格提示" : "instruction";

  return (
    <section>
      <h1>模板</h1>
      <div className="toolbar">
        {TABS.map((tab) => (
          <button
            key={tab.kind}
            className={kind === tab.kind ? "btn" : "btn ghost"}
            type="button"
            onClick={() => {
              setKind(tab.kind);
              setEditingId(null);
              setDraft(null);
              setCreateOpen(false);
            }}
          >
            {tab.label}
          </button>
        ))}
        <button className="btn ghost" type="button" onClick={() => setCreateOpen((open) => !open)}>
          {createOpen ? "取消新增" : "新增"}
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {createOpen ? (
        <form className="card" onSubmit={onCreate} style={{ display: "grid", gap: 10, marginBottom: 16 }}>
          <div className="row">
            <input value={create.id} onChange={(event) => setCreate({ ...create, id: event.target.value })} placeholder="id" required />
            <input
              type="number"
              value={create.sort}
              onChange={(event) => setCreate({ ...create, sort: Number(event.target.value) })}
            />
          </div>
          <div className="row">
            <input value={create.zh} onChange={(event) => setCreate({ ...create, zh: event.target.value })} placeholder="中文名" required />
            <input value={create.en} onChange={(event) => setCreate({ ...create, en: event.target.value })} placeholder="English" required />
          </div>
          <textarea
            value={create.blurbZh}
            onChange={(event) => setCreate({ ...create, blurbZh: event.target.value })}
            placeholder="中文簡介"
          />
          <textarea
            value={create.blurbEn}
            onChange={(event) => setCreate({ ...create, blurbEn: event.target.value })}
            placeholder="English blurb"
          />
          {kind !== "translate" ? (
            <textarea
              value={create.instruction}
              onChange={(event) => setCreate({ ...create, instruction: event.target.value })}
              placeholder={instructionLabel}
              style={{ minHeight: 120, whiteSpace: "pre-wrap" }}
            />
          ) : null}
          <button className="btn" type="submit" disabled={add.isPending}>
            建立
          </button>
        </form>
      ) : null}
      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>上架</th>
              <th>sort</th>
              <th>id</th>
              <th>中文</th>
              <th>English</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(rows.data?.items ?? []).map((item) => (
              <tr key={`${item.kind}:${item.id}`}>
                <td>
                  <input
                    type="checkbox"
                    checked={item.live}
                    onChange={(event) => update.mutate({ id: item.id, body: { live: event.target.checked } })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={item.sort}
                    onChange={(event) => update.mutate({ id: item.id, body: { sort: Number(event.target.value) } })}
                  />
                </td>
                <td>
                  <code>{item.id}</code>
                </td>
                <td>{item.zh}</td>
                <td>{item.en}</td>
                <td>
                  <button className="btn ghost" type="button" onClick={() => startEdit(item)}>
                    編輯
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.isLoading ? <p className="muted">載入中…</p> : null}
      </div>
      {draft && editingId === draft.id ? (
        <div className="card" style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <h2>
            編輯 {draft.zh} <span className="muted">· {draft.id}</span>
          </h2>
          <div className="row">
            <input value={draft.zh} onChange={(event) => setDraft({ ...draft, zh: event.target.value })} />
            <input value={draft.en} onChange={(event) => setDraft({ ...draft, en: event.target.value })} />
          </div>
          <textarea value={draft.blurbZh} onChange={(event) => setDraft({ ...draft, blurbZh: event.target.value })} />
          <textarea value={draft.blurbEn} onChange={(event) => setDraft({ ...draft, blurbEn: event.target.value })} />
          {kind !== "translate" ? (
            <textarea
              value={draft.instruction ?? ""}
              onChange={(event) => setDraft({ ...draft, instruction: event.target.value || undefined })}
              placeholder={instructionLabel}
              style={{ minHeight: 120, whiteSpace: "pre-wrap" }}
            />
          ) : null}
          <div className="row">
            <button className="btn" type="button" disabled={update.isPending} onClick={saveEdit}>
              儲存
            </button>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setEditingId(null);
                setDraft(null);
              }}
            >
              取消
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
