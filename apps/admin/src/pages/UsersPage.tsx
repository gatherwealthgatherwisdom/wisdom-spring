import { ApiError } from "@spring/api-client";
import { PlanTier, UserRole, UserStatus, microsToUsd, type AdminUpdateUserRequest, type AdminUserRow } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  DataTable,
  ErrorAlert,
  Input,
  NativeSelect,
  PageHeader,
  StatusBadge,
  TableCell,
  TableRow,
  TextLink,
  Toolbar,
} from "@/components";
import { client } from "../session";

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
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="搜尋電郵、電話或名稱"
          className="w-72"
        />
      </Toolbar>
      <ErrorAlert message={error} />
      <DataTable
        columns={["電郵", "電話", "名稱", "註冊", "試用", "本月", "角色", "計劃", "狀態", "", "詳情"]}
        loading={users.isLoading}
        empty={!users.isLoading && items.length === 0 ? "未有用戶。" : null}
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
      <TableCell>{user.email ?? "—"}</TableCell>
      <TableCell>{user.phone ?? "—"}</TableCell>
      <TableCell>{user.displayName ?? "—"}</TableCell>
      <TableCell>
        <StatusBadge value={user.registered ? "已註冊" : "訪客"} />
      </TableCell>
      <TableCell>
        <span className="mr-2">
          {user.guestUses}/{user.guestLimit}
        </span>
        <Button variant="ghost" size="sm" onClick={() => onChange({ resetGuestUses: true })}>
          重置
        </Button>
      </TableCell>
      <TableCell>
        {user.monthRequests} · ${microsToUsd(user.monthCostUsdMicros)}
      </TableCell>
      <TableCell>
        <NativeSelect value={user.role} onChange={(event) => onChange({ role: event.target.value as UserRole })}>
          <option value={UserRole.USER}>USER</option>
          <option value={UserRole.ADMIN}>ADMIN</option>
        </NativeSelect>
      </TableCell>
      <TableCell>
        <NativeSelect
          value={user.planTier}
          onChange={(event) => onChange({ planTier: event.target.value as PlanTier })}
        >
          <option value={PlanTier.FREE}>FREE</option>
          <option value={PlanTier.PLUS}>PLUS</option>
          <option value={PlanTier.INTERNAL}>INTERNAL</option>
        </NativeSelect>
      </TableCell>
      <TableCell>
        <StatusBadge value={user.status} />
      </TableCell>
      <TableCell>
        {user.status === UserStatus.SUSPENDED ? (
          <Button variant="ghost" size="sm" onClick={() => onChange({ status: UserStatus.ACTIVE })}>
            恢復
          </Button>
        ) : user.status === UserStatus.DELETED ? (
          "—"
        ) : (
          <Button variant="danger" size="sm" onClick={() => onChange({ status: UserStatus.SUSPENDED })}>
            暫停
          </Button>
        )}
      </TableCell>
      <TableCell>
        <TextLink to={`/users/${user.id}`}>詳情</TextLink>
      </TableCell>
    </TableRow>
  );
}
