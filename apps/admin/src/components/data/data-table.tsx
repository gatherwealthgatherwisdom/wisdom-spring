import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function DataTable({
  columns,
  loading,
  empty,
  children,
}: {
  columns: string[];
  loading?: boolean;
  empty?: string | null;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={`${index}-${column}`}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>{children}</TableBody>
        </Table>
      </div>
      {loading ? <p className="px-4 py-6 text-sm text-muted">載入中…</p> : null}
      {!loading && empty ? <p className="px-4 py-6 text-sm text-muted">{empty}</p> : null}
    </Card>
  );
}
