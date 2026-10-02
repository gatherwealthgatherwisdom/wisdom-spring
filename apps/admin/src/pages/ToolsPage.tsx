import { ApiError } from "@spring/api-client";
import type { AdminCatalogItem, CreateCatalogEntryRequest, UpdateCatalogEntryRequest } from "@spring/shared";
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

  const items = rows.data?.items ?? [];

  return (
    <section>
      <PageHeader title="工具" description="工具同助手上架之後會出現喺手機目錄。" />
      <Toolbar>
        <Tabs
          value={kind}
          onValueChange={(value) => {
            setKind(value as Kind);
            setEditingId(null);
            setDraft(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="tool">工具</TabsTrigger>
            <TabsTrigger value="aide">助手</TabsTrigger>
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
        empty={!rows.isLoading && items.length === 0 ? "未有項目。" : null}
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
            <TableCell>
              <CellChips
                items={[
                  item.mode,
                  item.templateId ? `模板 ${item.templateId}` : null,
                  item.icon,
                  item.page != null ? `頁 ${item.page}` : null,
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
              <DialogTitle>新增{kind === "tool" ? "工具" : "助手"}</DialogTitle>
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
            <Field label="instruction（可空）">
              <Textarea
                value={create.instruction}
                onChange={(event) => setCreate({ ...create, instruction: event.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="icon">
                <Input value={create.icon} onChange={(event) => setCreate({ ...create, icon: event.target.value })} />
              </Field>
              <Field label="mode">
                <Input value={create.mode} onChange={(event) => setCreate({ ...create, mode: event.target.value })} />
              </Field>
              <Field label="templateId">
                <Input
                  value={create.templateId}
                  onChange={(event) => setCreate({ ...create, templateId: event.target.value })}
                />
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
                <Field label="page">
                  <Input
                    type="number"
                    value={draft.page ?? ""}
                    onChange={(event) =>
                      setDraft({ ...draft, page: event.target.value === "" ? undefined : Number(event.target.value) })
                    }
                  />
                </Field>
              </div>
              <Field label="中文簡介">
                <Textarea value={draft.blurbZh} onChange={(event) => setDraft({ ...draft, blurbZh: event.target.value })} />
              </Field>
              <Field label="English blurb">
                <Textarea value={draft.blurbEn} onChange={(event) => setDraft({ ...draft, blurbEn: event.target.value })} />
              </Field>
              <Field label="instruction">
                <Textarea
                  className="min-h-[120px] whitespace-pre-wrap"
                  value={draft.instruction ?? ""}
                  onChange={(event) => setDraft({ ...draft, instruction: event.target.value || undefined })}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="icon">
                  <Input
                    value={draft.icon ?? ""}
                    onChange={(event) => setDraft({ ...draft, icon: event.target.value || undefined })}
                  />
                </Field>
                <Field label="mode">
                  <Input
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
                  />
                </Field>
                <Field label="templateId">
                  <Input
                    value={draft.templateId ?? ""}
                    onChange={(event) => setDraft({ ...draft, templateId: event.target.value || undefined })}
                  />
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
