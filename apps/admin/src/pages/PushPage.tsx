import { ApiError } from "@spring/api-client";
import { formatE164, type AdminUserRow } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  DataTable,
  ErrorAlert,
  Field,
  FilterField,
  Input,
  PageHeader,
  PrimaryCell,
  TableCell,
  TableRow,
  Textarea,
  Toolbar,
} from "@/components";
import { client } from "../session";

export function PushPage() {
  const queryClient = useQueryClient();
  const [titleZh, setTitleZh] = useState("");
  const [bodyZh, setBodyZh] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [scope, setScope] = useState<"all" | "selected">("selected");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");

  const audience = useQuery({
    queryKey: ["admin-inbox-audience"],
    queryFn: () => client.adminInboxAudience(),
  });
  const users = useQuery({
    queryKey: ["admin-users", q],
    queryFn: () => client.adminUsers(q || undefined),
  });
  const history = useQuery({
    queryKey: ["admin-audit", "inbox.send"],
    queryFn: () => client.adminAudit("inbox.send"),
  });

  const items = users.data?.items ?? [];
  const count = scope === "all" ? (audience.data?.count ?? 0) : selected.size;
  const ready = titleZh.trim().length > 0 && bodyZh.trim().length > 0 && count > 0;

  const send = useMutation({
    mutationFn: () =>
      client.adminSendInbox({
        titleZh: titleZh.trim(),
        bodyZh: bodyZh.trim(),
        titleEn: titleEn.trim() || undefined,
        bodyEn: bodyEn.trim() || undefined,
        ...(scope === "all" ? { all: true } : { userIds: [...selected] }),
      }),
    onSuccess: async (result) => {
      setError("");
      toast.success(`已發送給 ${result.userCount} 人（${result.withoutDevice} 人無裝置）。`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-audit"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-inbox-audience"] }),
      ]);
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "發送失敗。"),
  });

  const pageSelected = items.length > 0 && items.every((user) => selected.has(user.id));

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage(rows: AdminUserRow[]) {
    setSelected((current) => {
      const next = new Set(current);
      const allOn = rows.length > 0 && rows.every((row) => next.has(row.id));
      for (const row of rows) {
        if (allOn) next.delete(row.id);
        else next.add(row.id);
      }
      return next;
    });
  }

  const preview = useMemo(() => {
    if (scope === "all") return `全部活躍用戶，共 ${count} 人。無裝置的用戶仍會在 App 訊息看到。`;
    return `已選 ${count} 人。無裝置的用戶仍會在 App 訊息看到。`;
  }, [scope, count]);

  return (
    <section>
      <PageHeader title="推送" description="揀用戶或全部人，寫入 App 訊息並推送。公告橫幅仍然獨立。" />
      <ErrorAlert message={error} />
      <form
        className="mb-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <Card className="grid gap-3">
          <Field label="標題（繁體中文）">
            <Input value={titleZh} onChange={(event) => setTitleZh(event.target.value)} maxLength={80} required />
          </Field>
          <Field label="正文（繁體中文）">
            <Textarea value={bodyZh} onChange={(event) => setBodyZh(event.target.value)} maxLength={500} required />
          </Field>
          <Field label="Title (English)" hint="留空則跟繁中。">
            <Input value={titleEn} onChange={(event) => setTitleEn(event.target.value)} maxLength={80} />
          </Field>
          <Field label="Body (English)" hint="留空則跟繁中。">
            <Textarea value={bodyEn} onChange={(event) => setBodyEn(event.target.value)} maxLength={500} />
          </Field>
        </Card>
        <Card className="grid gap-3">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-ink">對象</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="inbox-scope"
                className="accent-pine"
                checked={scope === "all"}
                onChange={() => setScope("all")}
              />
              全部活躍用戶
              <span className="text-muted">（{audience.data?.count ?? "—"} 人）</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="inbox-scope"
                className="accent-pine"
                checked={scope === "selected"}
                onChange={() => setScope("selected")}
              />
              選擇用戶
            </label>
          </fieldset>
          {scope === "selected" ? (
            <>
              <Toolbar>
                <FilterField label="搜尋" className="min-w-[16rem] flex-1">
                  <Input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="電話或名稱"
                    className="w-full max-w-sm"
                  />
                </FilterField>
                <Button type="button" variant="ghost" size="sm" onClick={() => togglePage(items)}>
                  {pageSelected ? "取消本頁" : "全選本頁"}
                </Button>
              </Toolbar>
              <DataTable
                columns={[
                  { key: "pick", header: "", width: "2.5rem" },
                  { key: "user", header: "用戶" },
                ]}
                loading={users.isLoading}
                empty={!users.isLoading && items.length === 0 ? "未有用戶。" : null}
                count={items.length}
                resetKey={q}
              >
                {items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(user.id)}
                        onChange={() => toggle(user.id)}
                        aria-label={user.phone ? formatE164(user.phone) : user.id}
                      />
                    </TableCell>
                    <TableCell>
                      <PrimaryCell
                        title={user.phone ? formatE164(user.phone) : "—"}
                        subtitle={user.displayName ?? "未有名稱"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </DataTable>
            </>
          ) : null}
          <p className="text-sm text-muted">{preview}</p>
          <div>
            <ConfirmDialog
              title="確認發送"
              description={preview}
              confirmLabel="發送"
              onConfirm={() => send.mutate()}
              trigger={
                <Button type="button" disabled={!ready || send.isPending}>
                  {send.isPending ? "發送中…" : `預覽 ${count} 人`}
                </Button>
              }
            />
          </div>
        </Card>
      </form>
      <PageHeader title="最近發送" description="寫入審計紀錄。" className="mb-3" />
      <DataTable
        columns={[
          { key: "time", header: "時間", width: "11rem" },
          { key: "payload", header: "內容" },
        ]}
        loading={history.isLoading}
        empty={!history.isLoading && (history.data?.items.length ?? 0) === 0 ? "未有發送紀錄。" : null}
        count={history.data?.items.length ?? 0}
      >
        {(history.data?.items ?? []).map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap text-muted tabular-nums">
              {row.createdAt.slice(0, 19).replace("T", " ")}
            </TableCell>
            <TableCell>
              <pre className="max-h-32 max-w-[52rem] overflow-auto whitespace-pre-wrap rounded-lg bg-paper px-3 py-2 text-[12px] leading-relaxed text-ink">
                {JSON.stringify(row.payload, null, 2)}
              </pre>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>
    </section>
  );
}
