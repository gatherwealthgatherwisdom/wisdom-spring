import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, NativeSelect, PageHeader, TableCell, TableRow, Toolbar } from "@/components";
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
        <NativeSelect value={action} onChange={(event) => setAction(event.target.value)}>
          <option value="">全部動作</option>
          {ACTIONS.filter(Boolean).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </NativeSelect>
      </Toolbar>
      <DataTable
        columns={["時間", "動作", "內容"]}
        loading={audit.isLoading}
        empty={!audit.isLoading && items.length === 0 ? "未有紀錄。" : null}
      >
        {items.map((row) => (
          <TableRow key={row.id}>
            <TableCell>{row.createdAt.slice(0, 19).replace("T", " ")}</TableCell>
            <TableCell>{row.action}</TableCell>
            <TableCell className="max-w-[480px] whitespace-normal">
              <code>{JSON.stringify(row.payload)}</code>
            </TableCell>
          </TableRow>
        ))}
      </DataTable>
    </section>
  );
}
