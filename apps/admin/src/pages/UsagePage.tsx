import { formatE164 } from "@spring/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  DataTable,
  FilterField,
  Input,
  PageHeader,
  PrimaryCell,
  StatCard,
  TableCell,
  TableRow,
  TextLink,
  Toolbar,
} from "@/components";
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

function moneyColumns(nameHeader: string) {
  return [
    { key: "name", header: nameHeader, className: "min-w-[12rem]" },
    { key: "usd", header: "費用", align: "right" as const },
    { key: "requests", header: "請求", align: "right" as const },
  ];
}

export function UsagePage() {
  const [month, setMonth] = useState(currentHkMonth);
  const usage = useQuery({ queryKey: ["admin-usage", month], queryFn: () => client.adminUsage(month) });
  const data = usage.data;
  return (
    <section>
      <PageHeader title="用量" description="香港月份合計。按用戶最多 50 名，按費用排序。" />
      <Toolbar>
        <FilterField label="香港月份">
          <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="w-44" />
        </FilterField>
      </Toolbar>
      {usage.isLoading ? <p className="text-sm text-muted">載入中…</p> : null}
      {data ? (
        <div className="grid gap-6">
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
            <DataTable
              columns={moneyColumns("模型")}
              empty={data.byModel.length === 0 ? "呢個月未有模型用量。" : null}
              count={data.byModel.length}
            >
              {data.byModel.map((row) => (
                <TableRow key={row.model}>
                  <TableCell>
                    <PrimaryCell title={row.model} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{dollars(row.costUsdMicros)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.requests}</TableCell>
                </TableRow>
              ))}
            </DataTable>
          </div>
          <div>
            <h2 className="mb-2 text-base font-semibold">按用戶</h2>
            <DataTable
              columns={moneyColumns("用戶")}
              empty={data.byUser.length === 0 ? "呢個月未有用戶用量。" : null}
              count={data.byUser.length}
            >
              {data.byUser.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell>
                    <TextLink to={`/users/${row.userId}`}>
                      {row.phone ? formatE164(row.phone) : (row.displayName ?? row.userId)}
                    </TextLink>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{dollars(row.costUsdMicros)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.requests}</TableCell>
                </TableRow>
              ))}
            </DataTable>
          </div>
          <div>
            <h2 className="mb-2 text-base font-semibold">按計劃</h2>
            <DataTable
              columns={moneyColumns("計劃")}
              empty={data.byPlan.length === 0 ? "呢個月未有計劃用量。" : null}
              count={data.byPlan.length}
            >
              {data.byPlan.map((row) => (
                <TableRow key={row.planTier}>
                  <TableCell>{row.planTier}</TableCell>
                  <TableCell className="text-right tabular-nums">{dollars(row.costUsdMicros)}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.requests}</TableCell>
                </TableRow>
              ))}
            </DataTable>
          </div>
        </div>
      ) : null}
    </section>
  );
}
