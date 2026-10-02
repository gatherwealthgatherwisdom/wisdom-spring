import { ApiError } from "@spring/api-client";
import {
  PlanTier,
  UserRole,
  UserStatus,
  formatE164,
  microsToUsd,
  type AdminUpdateUserRequest,
  type AdminUserRow,
} from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  DataTable,
  ErrorAlert,
  FilterField,
  Input,
  NativeSelect,
  PageHeader,
  PrimaryCell,
  StatusBadge,
  TableCell,
  TableRow,
  TextLink,
  Toolbar,
} from "@/components";
import { client } from "../session";

const USER_COLUMNS = [
  { key: "user", header: "用戶", className: "min-w-[12rem]" },
  { key: "identity", header: "身份" },
  { key: "month", header: "本月", align: "right" as const },
  { key: "access", header: "角色／計劃" },
  { key: "status", header: "狀態" },
  { key: "link", header: "" },
];

export function UsersPage() {
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ["admin-users", q], queryFn: () => client.adminUsers(q || undefined) });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminUpdateUserRequest }) => client.adminUpdateUser(id, body),
    onSuccess: () => {
      setError("");
      toast.success("已更新用戶。");
      void queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "更新失敗。"),
  });
  const items = users.data?.items ?? [];

  return (
    <section>
      <PageHeader title="用戶" description="改計劃、角色、暫停。詳情頁可以加額外每日次數同睇對話。" />
      <Toolbar>
        <FilterField label="搜尋" className="min-w-[16rem] flex-1">
          <Input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="電話或名稱"
            className="w-full max-w-sm"
          />
        </FilterField>
      </Toolbar>
      <ErrorAlert message={error} />
      <DataTable
        columns={USER_COLUMNS}
        loading={users.isLoading}
        empty={!users.isLoading && items.length === 0 ? "未有用戶。" : null}
        count={items.length}
        resetKey={q}
      >
        {items.map((user) => (
          <UserRow key={user.id} user={user} onChange={(body) => update.mutate({ id: user.id, body })} />
        ))}
      </DataTable>
    </section>
  );
}

function UserRow({
  user,
  onChange,
}: {
  user: AdminUserRow;
  onChange: (body: AdminUpdateUserRequest) => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <PrimaryCell title={user.phone ? formatE164(user.phone) : "—"} subtitle={user.displayName ?? "未有名稱"} />
      </TableCell>
      <TableCell>
        <StatusBadge value={user.registered ? "已註冊" : "訪客"} />
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>
            試用 {user.guestUses}/{user.guestLimit}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onChange({ resetGuestUses: true })}>
            重置
          </Button>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        <p>{user.monthRequests} 次</p>
        <p className="mt-0.5 text-xs text-muted">${microsToUsd(user.monthCostUsdMicros)}</p>
      </TableCell>
      <TableCell>
        <div className="grid gap-1.5">
          <NativeSelect
            className="h-8 min-w-[7.5rem]"
            value={user.role}
            onChange={(event) => onChange({ role: event.target.value as UserRole })}
          >
            <option value={UserRole.USER}>USER</option>
            <option value={UserRole.ADMIN}>ADMIN</option>
          </NativeSelect>
          <NativeSelect
            className="h-8 min-w-[7.5rem]"
            value={user.planTier}
            onChange={(event) => onChange({ planTier: event.target.value as PlanTier })}
          >
            <option value={PlanTier.FREE}>FREE</option>
            <option value={PlanTier.PLUS}>PLUS</option>
            <option value={PlanTier.INTERNAL}>INTERNAL</option>
          </NativeSelect>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge value={user.status} />
          {user.status === UserStatus.SUSPENDED ? (
            <Button variant="ghost" size="sm" onClick={() => onChange({ status: UserStatus.ACTIVE })}>
              恢復
            </Button>
          ) : user.status === UserStatus.DELETED ? null : (
            <Button variant="danger" size="sm" onClick={() => onChange({ status: UserStatus.SUSPENDED })}>
              暫停
            </Button>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <TextLink to={`/users/${user.id}`}>詳情</TextLink>
      </TableCell>
    </TableRow>
  );
}
