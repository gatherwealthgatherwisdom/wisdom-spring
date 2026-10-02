import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  PageHeader,
  Textarea,
} from "@/components";
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
      toast.success("已發佈公告。");
      await refresh();
    },
  });
  const update = useMutation({
    mutationFn: (item: { id: string; bodyZh: string; bodyEn: string; active: boolean }) =>
      client.adminUpdateAnnouncement(item.id, { bodyZh: item.bodyZh, bodyEn: item.bodyEn, active: item.active }),
    onSuccess: async () => {
      setEditingId(null);
      toast.success("已更新公告。");
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => client.adminDeleteAnnouncement(id),
    onSuccess: () => {
      toast.success("已刪除公告。");
      void refresh();
    },
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    create.mutate();
  }

  return (
    <section>
      <PageHeader title="公告" description="上架公告會出現喺手機收件箱。" />
      <form className="mb-4" onSubmit={onSubmit}>
        <Card className="grid gap-3">
          <Field label="繁體中文">
            <Textarea value={bodyZh} onChange={(event) => setBodyZh(event.target.value)} required />
          </Field>
          <Field label="English">
            <Textarea value={bodyEn} onChange={(event) => setBodyEn(event.target.value)} required />
          </Field>
          <div>
            <Button type="submit" disabled={create.isPending}>
              發佈
            </Button>
          </div>
        </Card>
      </form>
      <Card className="divide-y divide-line p-0">
        {(rows.data?.items ?? []).map((item) => (
          <article key={item.id} className="grid gap-3 px-4 py-4">
            {editingId === item.id ? (
              <>
                <Textarea value={editZh} onChange={(event) => setEditZh(event.target.value)} />
                <Textarea value={editEn} onChange={(event) => setEditEn(event.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => update.mutate({ id: item.id, bodyZh: editZh, bodyEn: editEn, active: item.active })}
                  >
                    儲存
                  </Button>
                  <Button variant="ghost" onClick={() => setEditingId(null)}>
                    取消
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-ink">{item.bodyZh}</p>
                  <Badge tone={item.active ? "pine" : "muted"}>{item.active ? "上架" : "下架"}</Badge>
                </div>
                <p className="text-sm text-muted">{item.bodyEn}</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      update.mutate({ id: item.id, bodyZh: item.bodyZh, bodyEn: item.bodyEn, active: !item.active })
                    }
                  >
                    {item.active ? "下架" : "上架"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditZh(item.bodyZh);
                      setEditEn(item.bodyEn);
                    }}
                  >
                    編輯
                  </Button>
                  <ConfirmDialog
                    title="刪除公告"
                    description="刪除呢則公告？"
                    confirmLabel="刪除"
                    danger
                    onConfirm={() => remove.mutate(item.id)}
                    trigger={
                      <Button variant="danger" size="sm">
                        刪除
                      </Button>
                    }
                  />
                </div>
              </>
            )}
          </article>
        ))}
        {rows.isLoading ? <p className="px-4 py-6 text-sm text-muted">載入中…</p> : null}
      </Card>
    </section>
  );
}
