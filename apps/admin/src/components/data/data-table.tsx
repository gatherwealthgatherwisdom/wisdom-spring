import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn = {
  key: string;
  header: ReactNode;
  align?: "left" | "right";
  width?: string;
  className?: string;
};

export function DataTable({
  columns,
  loading,
  empty,
  count,
  total,
  children,
}: {
  columns: DataTableColumn[];
  loading?: boolean;
  empty?: string | null;
  count?: number;
  total?: number;
  children: ReactNode;
}) {
  const showFooter = !loading && !empty && (count != null || total != null);
  const footer =
    total != null && count != null && total !== count
      ? `顯示 ${count} 項，共 ${total} 項`
      : `共 ${count ?? total} 項`;

  return (
    <Card className="overflow-hidden p-0">
      <div
        className="max-h-[calc(100vh-24rem)] overflow-auto"
        aria-busy={loading || undefined}
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(column.align === "right" && "text-right", column.className)}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }, (_, index) => (
                <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <span className="block h-3.5 w-[70%] max-w-40 animate-pulse rounded bg-line" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : empty ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="px-4 py-8 text-center text-sm text-muted">
                  {empty}
                </TableCell>
              </TableRow>
            ) : (
              children
            )}
          </TableBody>
        </Table>
      </div>
      {showFooter ? (
        <div className="border-t border-line px-4 py-2.5 text-xs text-muted">{footer}</div>
      ) : null}
    </Card>
  );
}
