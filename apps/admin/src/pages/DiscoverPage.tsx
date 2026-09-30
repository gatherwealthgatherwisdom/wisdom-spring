import { ApiError } from "@spring/api-client";
import {
  DISCOVER_ART_IDS,
  DISCOVER_SECTIONS,
  IMAGE_STYLES,
  type AdminCatalogItem,
  type ConversationMode,
  type CreateCatalogEntryRequest,
  type DiscoverArtId,
  type DiscoverSection,
  type UpdateCatalogEntryRequest,
} from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { client } from "../session";

const SECTION_LABEL: Record<DiscoverSection, string> = {
  hero: "主視覺",
  reco: "推薦",
  draw: "圖像卡",
};

const emptyCreate = {
  id: "",
  zh: "",
  en: "",
  blurbZh: "",
  blurbEn: "",
  section: "reco" as DiscoverSection,
  tone: "#1F6B4A",
  art: "devices" as DiscoverArtId,
  templateId: "",
  mode: "",
  imageStyle: "",
  sort: 100,
};

function asMode(value: string): ConversationMode | undefined {
  if (value === "chat" || value === "write" || value === "translate" || value === "image") return value;
  return undefined;
}

export function DiscoverPage() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState<DiscoverSection | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminCatalogItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [create, setCreate] = useState(emptyCreate);
  const [error, setError] = useState("");

  const rows = useQuery({
    queryKey: ["admin-catalog", "discover"],
    queryFn: () => client.adminCatalog("discover"),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-catalog"] });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCatalogEntryRequest }) =>
      client.adminUpdateCatalog("discover", id, body),
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
        section: draft.section ?? null,
        tone: draft.tone ?? null,
        art: draft.art ?? null,
        templateId: draft.templateId ?? null,
        mode: draft.mode ?? null,
        imageStyle: draft.imageStyle ?? null,
      },
    });
  }

  function onCreate(event: FormEvent) {
    event.preventDefault();
    const mode = asMode(create.mode);
    add.mutate({
      kind: "discover",
      id: create.id,
      zh: create.zh,
      en: create.en,
      blurbZh: create.blurbZh,
      blurbEn: create.blurbEn,
      live: true,
      sort: create.sort,
      section: create.section,
      tone: create.tone,
      art: create.art,
      ...(create.templateId ? { templateId: create.templateId } : {}),
      ...(mode ? { mode } : {}),
      ...(create.imageStyle ? { imageStyle: create.imageStyle } : {}),
    });
  }

  const items = (rows.data?.items ?? []).filter((item) => section === "all" || item.section === section);

  return (
    <section>
      <h1>發現</h1>
      <p className="note">
        封面只可揀現有圖，唔可以上傳。首頁四個工具圖示喺「工具」頁，page 設為 0。
      </p>
      <div className="toolbar">
        <button
          className={section === "all" ? "btn" : "btn ghost"}
          type="button"
          onClick={() => setSection("all")}
        >
          全部
        </button>
        {DISCOVER_SECTIONS.map((id) => (
          <button
            key={id}
            className={section === id ? "btn" : "btn ghost"}
            type="button"
            onClick={() => {
              setSection(id);
              setEditingId(null);
              setDraft(null);
            }}
          >
            {SECTION_LABEL[id]}
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
            <input
              value={create.id}
              onChange={(event) => setCreate({ ...create, id: event.target.value })}
              placeholder="id"
              required
            />
            <input
              type="number"
              value={create.sort}
              onChange={(event) => setCreate({ ...create, sort: Number(event.target.value) })}
            />
            <select
              value={create.section}
              onChange={(event) => setCreate({ ...create, section: event.target.value as DiscoverSection })}
            >
              {DISCOVER_SECTIONS.map((id) => (
                <option key={id} value={id}>
                  {SECTION_LABEL[id]}
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <input
              value={create.zh}
              onChange={(event) => setCreate({ ...create, zh: event.target.value })}
              placeholder="中文名"
              required
            />
            <input
              value={create.en}
              onChange={(event) => setCreate({ ...create, en: event.target.value })}
              placeholder="English"
              required
            />
          </div>
          <textarea
            value={create.blurbZh}
            onChange={(event) => setCreate({ ...create, blurbZh: event.target.value })}
            placeholder="中文簡介"
            required
          />
          <textarea
            value={create.blurbEn}
            onChange={(event) => setCreate({ ...create, blurbEn: event.target.value })}
            placeholder="English blurb"
            required
          />
          <div className="row">
            <select value={create.art} onChange={(event) => setCreate({ ...create, art: event.target.value as (typeof DISCOVER_ART_IDS)[number] })}>
              {DISCOVER_ART_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <input
              value={create.tone}
              onChange={(event) => setCreate({ ...create, tone: event.target.value })}
              placeholder="#1F6B4A"
              required
            />
            <input
              value={create.templateId}
              onChange={(event) => setCreate({ ...create, templateId: event.target.value })}
              placeholder="工具 id"
            />
            <select value={create.mode} onChange={(event) => setCreate({ ...create, mode: event.target.value })}>
              <option value="">mode</option>
              <option value="chat">chat</option>
              <option value="write">write</option>
              <option value="translate">translate</option>
              <option value="image">image</option>
            </select>
            <select
              value={create.imageStyle}
              onChange={(event) => setCreate({ ...create, imageStyle: event.target.value })}
            >
              <option value="">imageStyle</option>
              {IMAGE_STYLES.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.id}
                </option>
              ))}
            </select>
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
              <th>區</th>
              <th>中文</th>
              <th>English</th>
              <th>art</th>
              <th>tone</th>
              <th>工具</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
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
                <td>{item.section ? SECTION_LABEL[item.section] ?? item.section : "—"}</td>
                <td>{item.zh}</td>
                <td>{item.en}</td>
                <td>{item.art ?? "—"}</td>
                <td>
                  <code>{item.tone ?? "—"}</code>
                </td>
                <td>{item.templateId ?? "—"}</td>
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
            <select
              value={draft.section ?? "reco"}
              onChange={(event) => setDraft({ ...draft, section: event.target.value as DiscoverSection })}
            >
              {DISCOVER_SECTIONS.map((id) => (
                <option key={id} value={id}>
                  {SECTION_LABEL[id]}
                </option>
              ))}
            </select>
          </div>
          <textarea value={draft.blurbZh} onChange={(event) => setDraft({ ...draft, blurbZh: event.target.value })} />
          <textarea value={draft.blurbEn} onChange={(event) => setDraft({ ...draft, blurbEn: event.target.value })} />
          <div className="row">
            <select
              value={draft.art ?? DISCOVER_ART_IDS[0]}
              onChange={(event) =>
                setDraft({ ...draft, art: event.target.value as (typeof DISCOVER_ART_IDS)[number] })
              }
            >
              {DISCOVER_ART_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <input
              value={draft.tone ?? ""}
              onChange={(event) => setDraft({ ...draft, tone: event.target.value || undefined })}
              placeholder="#1F6B4A"
            />
            <input
              value={draft.templateId ?? ""}
              onChange={(event) => setDraft({ ...draft, templateId: event.target.value || undefined })}
              placeholder="工具 id"
            />
            <select
              value={draft.mode ?? ""}
              onChange={(event) => setDraft({ ...draft, mode: asMode(event.target.value) })}
            >
              <option value="">mode</option>
              <option value="chat">chat</option>
              <option value="write">write</option>
              <option value="translate">translate</option>
              <option value="image">image</option>
            </select>
            <select
              value={draft.imageStyle ?? ""}
              onChange={(event) => setDraft({ ...draft, imageStyle: event.target.value || undefined })}
            >
              <option value="">imageStyle</option>
              {IMAGE_STYLES.map((style) => (
                <option key={style.id} value={style.id}>
                  {style.id}
                </option>
              ))}
            </select>
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
