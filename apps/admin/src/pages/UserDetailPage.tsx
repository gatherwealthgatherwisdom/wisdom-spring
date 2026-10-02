import { ApiError } from "@spring/api-client";
import { formatE164, microsToUsd } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Breadcrumbs,
  Button,
  Card,
  DataTable,
  ErrorAlert,
  FieldRow,
  Input,
  PageHeader,
  PrimaryCell,
  StatCard,
  StatusBadge,
  TableCell,
  TableRow,
  TextLink,
} from "@/components";
import { client } from "../session";

export function UserDetailPage() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [bonus, setBonus] = useState("0");
  const [error, setError] = useState("");
  const detail = useQuery({ queryKey: ["admin-user", id], queryFn: () => client.adminUser(id), enabled: Boolean(id) });
  const threads = useQuery({
    queryKey: ["admin-user-conversations", id],
    queryFn: () => client.adminUserConversations(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (detail.data) setBonus(String(detail.data.user.bonusDailyMessages));
  }, [detail.data]);

  const update = useMutation({
    mutationFn: (bonusDailyMessages: number) => client.adminUpdateUser(id, { bonusDailyMessages }),
    onSuccess: async () => {
      setError("");
      toast.success("已儲存額外次數。");
      await queryClient.invalidateQueries({ queryKey: ["admin-user", id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "更新失敗。"),
  });

  const data = detail.data;
  const items = threads.data?.items ?? [];
  return (
    <section>
      <Breadcrumbs items={[{ href: "/users", label: "用戶" }, { label: "詳情" }]} />
      <PageHeader title="用戶詳情" description="只讀對話。額外每日次數只加喺已註冊用戶。" />
      <ErrorAlert message={error} />
      {detail.isLoading ? <p className="text-sm text-muted">載入中…</p> : null}
      {data ? (
        <div className="grid gap-4">
          <Card>
            <p className="font-medium text-ink">
              {data.user.phone ? formatE164(data.user.phone) : "—"}
              {data.user.displayName ? ` · ${data.user.displayName}` : ""}
            </p>
            <p className="mt-1 flex flex-wrap gap-2 text-sm">
              <StatusBadge value={data.user.registered ? "已註冊" : "訪客"} />
              <StatusBadge value={data.user.planTier} />
              <StatusBadge value={data.user.status} />
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="今日" value={`${data.quota.dailyUsed} / ${data.quota.dailyLimit}`} />
              <StatCard label="本月請求" value={data.monthUsage.requests} />
              <StatCard label="本月費用" value={`$${microsToUsd(data.monthUsage.costUsdMicros)}`} />
              <StatCard label="讚 / 踩" value={`${data.thumbs.up} / ${data.thumbs.down}`} />
            </div>
            <div className="mt-4">
              <FieldRow label="額外每日次數">
                <Input
                  type="number"
                  min={0}
                  max={10000}
                  value={bonus}
                  onChange={(event) => setBonus(event.target.value)}
                />
                <Button disabled={update.isPending} onClick={() => update.mutate(Number(bonus))}>
                  儲存
                </Button>
              </FieldRow>
            </div>
          </Card>
          <div>
            <h2 className="mb-2 text-base font-semibold">對話</h2>
            <DataTable
              columns={[
                { key: "title", header: "對話", className: "min-w-[12rem]" },
                { key: "status", header: "狀態" },
                { key: "last", header: "最後訊息" },
                { key: "link", header: "" },
              ]}
              loading={threads.isLoading}
              empty={!threads.isLoading && items.length === 0 ? "未有對話。" : null}
              count={items.length}
              resetKey={id}
            >
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <PrimaryCell title={item.title ?? "未有標題"} subtitle={<StatusBadge value={item.mode} />} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={item.status} />
                  </TableCell>
                  <TableCell className="text-muted tabular-nums">
                    {item.lastMessageAt.slice(0, 16).replace("T", " ")}
                  </TableCell>
                  <TableCell className="text-right">
                    <TextLink to={`/users/${id}/c/${item.id}`}>查看</TextLink>
                  </TableCell>
                </TableRow>
              ))}
            </DataTable>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function UserThreadPage() {
  const { id = "", conversationId = "" } = useParams();
  const thread = useQuery({
    queryKey: ["admin-conversation", conversationId],
    queryFn: () => client.adminConversation(conversationId),
    enabled: Boolean(conversationId),
  });
  const data = thread.data;
  return (
    <section>
      <Breadcrumbs
        items={[
          { href: "/users", label: "用戶" },
          { href: `/users/${id}`, label: "詳情" },
          { label: data?.conversation.title ?? "對話" },
        ]}
      />
      <PageHeader title={data?.conversation.title ?? "對話"} />
      {thread.isLoading ? <p className="text-sm text-muted">載入中…</p> : null}
      {data ? (
        <Card className="grid gap-4">
          <p className="flex flex-wrap gap-2 text-sm">
            <StatusBadge value={data.conversation.mode} />
            <StatusBadge value={data.conversation.status} />
          </p>
          {data.messages.map((message) => (
            <article key={message.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
              <p className="text-xs text-muted">
                {message.role} · {message.status}
                {message.servedModel ? ` · ${message.servedModel}` : ""}
                {message.feedback ? ` · ${message.feedback}` : ""}
                {message.costUsdMicros !== "0" ? ` · $${microsToUsd(message.costUsdMicros)}` : ""}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{message.content || "—"}</p>
            </article>
          ))}
        </Card>
      ) : null}
    </section>
  );
}
