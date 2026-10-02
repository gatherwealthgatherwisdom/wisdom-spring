import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, Input, PageHeader, StatCard, TableCell, TableRow, TextLink, Toolbar } from "@/components";
import { client } from "../session";

function dollars(micros: string): string {
  return `$${(Number(micros) / 1_000_000).toFixed(4)}`;
}

function currentHkMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

export function UsagePage() {
  const [month, setMonth] = useState(currentHkMonth);
  const usage = useQuery({ queryKey: ["admin-usage", month], queryFn: () => client.adminUsage(month) });
  const data = usage.data;
  return (
    <section>
      <PageHeader title="用量" description="香港月份合計。按用戶最多 50 名，按費用排序。" />
      <Toolbar>
        <label className="flex items-center gap-2 text-sm text-muted">
          香港月份
          <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-44" />
        </label>
      </Toolbar>
      {data ? (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="費用" value={dollars(data.totals.costUsdMicros)} hint={`${data.from.slice(0, 10)} → ${data.to.slice(0, 10)}`} />
            <StatCard label="請求" value={data.totals.requests} />
            <StatCard
              label="tokens"
              value={`${data.totals.promptTokens} / ${data.totals.completionTokens}`}
            />
            <StatCard
              label="封鎖 / 後備"
              value={`${(data.totals.regionBlockRate * 100).toFixed(1)}%`}
              hint={`後備 ${(data.totals.fallbackRate * 100).toFixed(1)}%`}
            />
          </div>
          <div>
            <h2 className="mb-2 text-base font-semibold">按模型</h2>
            <DataTable columns={["model", "USD", "requests"]}>
              {data.byModel.map((row) => (
                <TableRow key={row.model}>
                  <TableCell>{row.model}</TableCell>
                  <TableCell>{dollars(row.costUsdMicros)}</TableCell>
                  <TableCell>{row.requests}</TableCell>
                </TableRow>
              ))}
            </DataTable>
          </div>
          <div>
            <h2 className="mb-2 text-base font-semibold">按用戶</h2>
            <DataTable columns={["用戶", "USD", "requests"]} empty={data.byUser.length === 0 ? "呢個月未有用戶用量。" : null}>
              {data.byUser.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>
                    <TextLink to={`/users/${row.userId}`}>
                      {row.email ?? row.phone ?? row.displayName ?? row.userId}
                    </TextLink>
                  </TableCell>
                  <TableCell>{dollars(row.costUsdMicros)}</TableCell>
                  <TableCell>{row.requests}</TableCell>
                </TableRow>
              ))}
            </DataTable>
          </div>
          <div>
            <h2 className="mb-2 text-base font-semibold">按計劃</h2>
            <DataTable columns={["plan", "USD", "requests"]}>
              {data.byPlan.map((row) => (
                <TableRow key={row.planTier}>
                  <TableCell>{row.planTier}</TableCell>
                  <TableCell>{dollars(row.costUsdMicros)}</TableCell>
                  <TableCell>{row.requests}</TableCell>
                </TableRow>
              ))}
            </DataTable>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">載入中…</p>
      )}
    </section>
  );
}
