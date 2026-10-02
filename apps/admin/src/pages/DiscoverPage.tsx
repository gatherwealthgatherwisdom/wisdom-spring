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
import { toast } from "sonner";
import {
  Button,
  CellChips,
  CompactNumber,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorAlert,
  Field,
  Input,
  NativeSelect,
  PageHeader,
  PrimaryCell,
  Switch,
  TableCell,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  Toolbar,
} from "@/components";
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
      toast.success("已儲存。");
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
      toast.success("已新增。");
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
      <PageHeader title="發現" description="封面只可揀現有圖，唔可以上傳。首頁四個工具圖示喺「工具」頁，page 設為 0。" />
      <Toolbar>
        <Tabs
          value={section}
          onValueChange={(value) => {
            setSection(value as DiscoverSection | "all");
            setEditingId(null);
            setDraft(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            {DISCOVER_SECTIONS.map((id) => (
              <TabsTrigger key={id} value={id}>
                {SECTION_LABEL[id]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button variant="ghost" onClick={() => setCreateOpen(true)}>
          新增
        </Button>
      </Toolbar>
      <ErrorAlert message={error} />
      <DataTable
        columns={[
          { key: "live", header: "上架", width: "4.5rem" },
          { key: "item", header: "項目", className: "min-w-[14rem]" },
          { key: "sort", header: "排序" },
          { key: "attrs", header: "屬性" },
          { key: "edit", header: "" },
        ]}
        loading={rows.isLoading}
        empty={!rows.isLoading && items.length === 0 ? "未有卡片。" : null}
        count={items.length}
      >
        {items.map((item) => (
          <TableRow key={`${item.kind}:${item.id}`}>
            <TableCell>
              <Switch
                checked={item.live}
                onCheckedChange={(checked) => update.mutate({ id: item.id, body: { live: checked } })}
              />
            </TableCell>
            <TableCell>
              <PrimaryCell title={item.zh} subtitle={`${item.id} · ${item.en}`} />
            </TableCell>
            <TableCell>
              <CompactNumber
                value={item.sort}
                min={0}
                max={10_000}
                onCommit={(sort) => update.mutate({ id: item.id, body: { sort } })}
              />
            </TableCell>
            <TableCell>
              <CellChips
                items={[
                  item.section ? SECTION_LABEL[item.section] ?? item.section : null,
                  item.art,
                  item.templateId ? `工具 ${item.templateId}` : null,
                  item.mode,
                ]}
              />
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                編輯
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form className="grid gap-3" onSubmit={onCreate}>
            <DialogHeader>
              <DialogTitle>新增發現卡</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="id">
                <Input value={create.id} onChange={(event) => setCreate({ ...create, id: event.target.value })} required />
              </Field>
              <Field label="sort">
                <Input
                  type="number"
                  value={create.sort}
                  onChange={(event) => setCreate({ ...create, sort: Number(event.target.value) })}
                />
              </Field>
              <Field label="區">
                <NativeSelect
                  value={create.section}
                  onChange={(event) => setCreate({ ...create, section: event.target.value as DiscoverSection })}
                >
                  {DISCOVER_SECTIONS.map((id) => (
                    <option key={id} value={id}>
                      {SECTION_LABEL[id]}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="中文名">
                <Input value={create.zh} onChange={(event) => setCreate({ ...create, zh: event.target.value })} required />
              </Field>
              <Field label="English">
                <Input value={create.en} onChange={(event) => setCreate({ ...create, en: event.target.value })} required />
              </Field>
            </div>
            <Field label="中文簡介">
              <Textarea
                value={create.blurbZh}
                onChange={(event) => setCreate({ ...create, blurbZh: event.target.value })}
                required
              />
            </Field>
            <Field label="English blurb">
              <Textarea
                value={create.blurbEn}
                onChange={(event) => setCreate({ ...create, blurbEn: event.target.value })}
                required
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="art">
                <NativeSelect
                  value={create.art}
                  onChange={(event) => setCreate({ ...create, art: event.target.value as DiscoverArtId })}
                >
                  {DISCOVER_ART_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="tone">
                <Input
                  value={create.tone}
                  onChange={(event) => setCreate({ ...create, tone: event.target.value })}
                  required
                />
              </Field>
              <Field label="工具 id">
                <Input
                  value={create.templateId}
                  onChange={(event) => setCreate({ ...create, templateId: event.target.value })}
                />
              </Field>
              <Field label="mode">
                <NativeSelect value={create.mode} onChange={(event) => setCreate({ ...create, mode: event.target.value })}>
                  <option value="">—</option>
                  <option value="chat">chat</option>
                  <option value="write">write</option>
                  <option value="translate">translate</option>
                  <option value="image">image</option>
                </NativeSelect>
              </Field>
              <Field label="imageStyle">
                <NativeSelect
                  value={create.imageStyle}
                  onChange={(event) => setCreate({ ...create, imageStyle: event.target.value })}
                >
                  <option value="">—</option>
                  {IMAGE_STYLES.map((style) => (
                    <option key={style.id} value={style.id}>
                      {style.id}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={add.isPending}>
                建立
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(draft && editingId === draft.id)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingId(null);
            setDraft(null);
          }
        }}
      >
        <DialogContent>
          {draft ? (
            <div className="grid gap-3">
              <DialogHeader>
                <DialogTitle>
                  編輯 {draft.zh} <span className="text-sm font-normal text-muted">· {draft.id}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="中文">
                  <Input value={draft.zh} onChange={(event) => setDraft({ ...draft, zh: event.target.value })} />
                </Field>
                <Field label="English">
                  <Input value={draft.en} onChange={(event) => setDraft({ ...draft, en: event.target.value })} />
                </Field>
                <Field label="區">
                  <NativeSelect
                    value={draft.section ?? "reco"}
                    onChange={(event) => setDraft({ ...draft, section: event.target.value as DiscoverSection })}
                  >
                    {DISCOVER_SECTIONS.map((id) => (
                      <option key={id} value={id}>
                        {SECTION_LABEL[id]}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <Field label="中文簡介">
                <Textarea value={draft.blurbZh} onChange={(event) => setDraft({ ...draft, blurbZh: event.target.value })} />
              </Field>
              <Field label="English blurb">
                <Textarea value={draft.blurbEn} onChange={(event) => setDraft({ ...draft, blurbEn: event.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="art">
                  <NativeSelect
                    value={draft.art ?? "devices"}
                    onChange={(event) => setDraft({ ...draft, art: event.target.value as DiscoverArtId })}
                  >
                    {DISCOVER_ART_IDS.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="tone">
                  <Input
                    value={draft.tone ?? ""}
                    onChange={(event) => setDraft({ ...draft, tone: event.target.value || undefined })}
                  />
                </Field>
                <Field label="工具 id">
                  <Input
                    value={draft.templateId ?? ""}
                    onChange={(event) => setDraft({ ...draft, templateId: event.target.value || undefined })}
                  />
                </Field>
                <Field label="mode">
                  <NativeSelect
                    value={draft.mode ?? ""}
                    onChange={(event) => setDraft({ ...draft, mode: asMode(event.target.value) })}
                  >
                    <option value="">—</option>
                    <option value="chat">chat</option>
                    <option value="write">write</option>
                    <option value="translate">translate</option>
                    <option value="image">image</option>
                  </NativeSelect>
                </Field>
                <Field label="imageStyle">
                  <NativeSelect
                    value={draft.imageStyle ?? ""}
                    onChange={(event) => setDraft({ ...draft, imageStyle: event.target.value || undefined })}
                  >
                    <option value="">—</option>
                    {IMAGE_STYLES.map((style) => (
                      <option key={style.id} value={style.id}>
                        {style.id}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <DialogFooter>
                <Button disabled={update.isPending} onClick={saveEdit}>
                  儲存
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
