import { ApiError } from "@spring/api-client";
import type { AdminCatalogItem, CatalogKind, CreateCatalogEntryRequest, UpdateCatalogEntryRequest } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Button,
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
  const items = rows.data?.items ?? [];

  return (
    <section>
      <PageHeader title="模板" description="寫作模板、圖像風格、翻譯語言。" />
      <Toolbar>
        <Tabs
          value={kind}
          onValueChange={(value) => {
            setKind(value as Kind);
            setEditingId(null);
            setDraft(null);
            setCreateOpen(false);
          }}
        >
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.kind} value={tab.kind}>
                {tab.label}
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
          { key: "edit", header: "" },
        ]}
        loading={rows.isLoading}
        empty={!rows.isLoading && items.length === 0 ? "未有模板。" : null}
        count={items.length}
        resetKey={kind}
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
              <DialogTitle>新增模板</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2">
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
              />
            </Field>
            <Field label="English blurb">
              <Textarea
                value={create.blurbEn}
                onChange={(event) => setCreate({ ...create, blurbEn: event.target.value })}
              />
            </Field>
            {kind !== "translate" ? (
              <Field label={instructionLabel}>
                <Textarea
                  className="min-h-[120px] whitespace-pre-wrap"
                  value={create.instruction}
                  onChange={(event) => setCreate({ ...create, instruction: event.target.value })}
                />
              </Field>
            ) : null}
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
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="中文">
                  <Input value={draft.zh} onChange={(event) => setDraft({ ...draft, zh: event.target.value })} />
                </Field>
                <Field label="English">
                  <Input value={draft.en} onChange={(event) => setDraft({ ...draft, en: event.target.value })} />
                </Field>
              </div>
              <Field label="中文簡介">
                <Textarea value={draft.blurbZh} onChange={(event) => setDraft({ ...draft, blurbZh: event.target.value })} />
              </Field>
              <Field label="English blurb">
                <Textarea value={draft.blurbEn} onChange={(event) => setDraft({ ...draft, blurbEn: event.target.value })} />
              </Field>
              {kind !== "translate" ? (
                <Field label={instructionLabel}>
                  <Textarea
                    className="min-h-[120px] whitespace-pre-wrap"
                    value={draft.instruction ?? ""}
                    onChange={(event) => setDraft({ ...draft, instruction: event.target.value || undefined })}
                  />
                </Field>
              ) : null}
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
