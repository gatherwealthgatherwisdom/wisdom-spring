import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge, DataTable, FilterField, NativeSelect, PageHeader, TableCell, TableRow, Toolbar } from "@/components";
import { client } from "../session";

const ACTIONS = [
  "",
  "user.update",
  "model.update",
  "model.probe",
  "model.enable.denied",
  "flag.update",
  "announcement.create",
  "announcement.update",
  "announcement.delete",
  "catalog.sync",
  "catalog.probe",
  "catalog.update",
  "catalog.create",
];

function prettyPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export function AuditPage() {
  const [action, setAction] = useState("");
  const audit = useQuery({
    queryKey: ["admin-audit", action],
    queryFn: () => client.adminAudit(action || undefined),
  });
  const items = audit.data?.items ?? [];
  return (
    <section>
      <PageHeader title="審計" description="只讀操作紀錄，唔可以改。" />
      <Toolbar>
        <FilterField label="動作">
          <NativeSelect className="min-w-[12rem]" value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="">全部動作</option>
            {ACTIONS.filter(Boolean).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
      </Toolbar>
      <DataTable
        columns={[
          { key: "time", header: "時間", width: "11rem" },
          { key: "action", header: "動作" },
          { key: "payload", header: "內容" },
        ]}
        loading={audit.isLoading}
        empty={!audit.isLoading && items.length === 0 ? "未有紀錄。" : null}
        count={items.length}
      >
        {items.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap text-muted tabular-nums">
              {row.createdAt.slice(0, 19).replace("T", " ")}
            </TableCell>
            <TableCell>
              <Badge tone="cream">{row.action}</Badge>
            </TableCell>
            <TableCell>
              <pre className="max-h-40 max-w-[52rem] overflow-auto whitespace-pre-wrap rounded-lg bg-paper px-3 py-2 text-[12px] leading-relaxed text-ink">
                {prettyPayload(row.payload)}
              </pre>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>
    </section>
  );
}
