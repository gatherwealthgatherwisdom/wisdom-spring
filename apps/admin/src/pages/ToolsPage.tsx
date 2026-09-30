import { ApiError } from "@spring/api-client";
import type { AdminCatalogItem, CreateCatalogEntryRequest, UpdateCatalogEntryRequest } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { client } from "../session";

type Kind = "tool" | "aide";

const emptyCreate = {
  id: "",
  zh: "",
  en: "",
  blurbZh: "",
  blurbEn: "",
  instruction: "",
  icon: "",
  mode: "",
  templateId: "",
  sort: 100,
};

export function ToolsPage() {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<Kind>("tool");
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
        mode: draft.mode ?? null,
        templateId: draft.templateId ?? null,
        instruction: draft.instruction ?? null,
        icon: draft.icon ?? null,
        page: draft.page ?? null,
      },
    });
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    add.mutate({
      kind,
      id: create.id,
      zh: create.zh,
      en: create.en,
      blurbZh: create.blurbZh,
      blurbEn: create.blurbEn,
      live: true,
      sort: create.sort,
      ...(create.mode === "chat" || create.mode === "write" || create.mode === "translate" || create.mode === "image"
        ? { mode: create.mode }
        : {}),
      ...(create.templateId ? { templateId: create.templateId } : {}),
      ...(create.instruction ? { instruction: create.instruction } : {}),
      ...(create.icon ? { icon: create.icon } : {}),
    });
  }

  return (
    <section>
      <h1>工具</h1>
      <div className="toolbar">
        <button className={kind === "tool" ? "btn" : "btn ghost"} type="button" onClick={() => setKind("tool")}>
          工具
        </button>
        <button className={kind === "aide" ? "btn" : "btn ghost"} type="button" onClick={() => setKind("aide")}>
          助手
        </button>
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
          <textarea value={create.blurbZh} onChange={(event) => setCreate({ ...create, blurbZh: event.target.value })} placeholder="中文簡介" required />
          <textarea value={create.blurbEn} onChange={(event) => setCreate({ ...create, blurbEn: event.target.value })} placeholder="English blurb" required />
          <textarea value={create.instruction} onChange={(event) => setCreate({ ...create, instruction: event.target.value })} placeholder="instruction（可空）" />
          <div className="row">
            <input value={create.icon} onChange={(event) => setCreate({ ...create, icon: event.target.value })} placeholder="icon" />
            <input value={create.mode} onChange={(event) => setCreate({ ...create, mode: event.target.value })} placeholder="mode" />
            <input value={create.templateId} onChange={(event) => setCreate({ ...create, templateId: event.target.value })} placeholder="templateId" />
          </div>
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
              <th>mode</th>
              <th>template</th>
              <th>icon</th>
              <th>page</th>
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
                <td>{item.mode ?? "—"}</td>
                <td>{item.templateId ?? "—"}</td>
                <td>{item.icon ?? "—"}</td>
                <td>{item.page ?? "—"}</td>
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
            <input
              type="number"
              value={draft.page ?? ""}
              placeholder="page"
              onChange={(event) =>
                setDraft({ ...draft, page: event.target.value === "" ? undefined : Number(event.target.value) })
              }
            />
          </div>
          <textarea value={draft.blurbZh} onChange={(event) => setDraft({ ...draft, blurbZh: event.target.value })} />
          <textarea value={draft.blurbEn} onChange={(event) => setDraft({ ...draft, blurbEn: event.target.value })} />
          <textarea
            value={draft.instruction ?? ""}
            onChange={(event) => setDraft({ ...draft, instruction: event.target.value || undefined })}
            placeholder="instruction"
            style={{ minHeight: 120, whiteSpace: "pre-wrap" }}
          />
          <div className="row">
            <input
              value={draft.icon ?? ""}
              onChange={(event) => setDraft({ ...draft, icon: event.target.value || undefined })}
              placeholder="icon"
            />
            <input
              value={draft.mode ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  mode:
                    event.target.value === "chat" ||
                    event.target.value === "write" ||
                    event.target.value === "translate" ||
                    event.target.value === "image"
                      ? event.target.value
                      : undefined,
                })
              }
              placeholder="mode"
            />
            <input
              value={draft.templateId ?? ""}
              onChange={(event) => setDraft({ ...draft, templateId: event.target.value || undefined })}
              placeholder="templateId"
            />
          </div>
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
