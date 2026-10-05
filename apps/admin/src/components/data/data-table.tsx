import { Children, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableColumn = {
  key: string;
  header: ReactNode;
  align?: "left" | "right";
  width?: string;
  className?: string;
};

const PAGE_SIZES = [20, 50, 100] as const;

function pageItems(page: number, pageCount: number): Array<number | "ellipsis"> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  const keep = new Set(
    [1, pageCount, page - 2, page - 1, page, page + 1, page + 2].filter((value) => value >= 1 && value <= pageCount),
  );
  const items: Array<number | "ellipsis"> = [];
  for (const value of [...keep].sort((left, right) => left - right)) {
    const prev = items[items.length - 1];
    if (typeof prev === "number" && value > prev + 1) items.push("ellipsis");
    items.push(value);
  }
  return items;
}

export function DataTable({
  columns,
  loading,
  empty,
  count,
  total,
  resetKey,
  children,
}: {
  columns: DataTableColumn[];
  loading?: boolean;
  empty?: string | null;
  count?: number;
  total?: number;
  resetKey?: string | number;
  children: ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);

  useEffect(() => {
    setPage(1);
  }, [resetKey, pageSize]);

  const rows = Children.toArray(children);
  const rowCount = count ?? rows.length;
  const pageCount = Math.max(1, Math.ceil(rowCount / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = rowCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, rowCount);
  const showFooter = !loading && !empty && rowCount > 0;
  const showPager = pageCount > 1;
  const summary =
    total != null && total !== rowCount
      ? `第 ${from}–${to} 項，共 ${rowCount} 項 · 全部 ${total}`
      : `第 ${from}–${to} 項，共 ${rowCount} 項`;

  return (
    <Card className="overflow-hidden p-0">
      <div
        className="min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain lg:max-h-[calc(100vh-24rem)]"
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
              pageRows
            )}
          </TableBody>
        </Table>
      </div>
      {showFooter ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5">
          <p className="text-xs text-muted">{summary}</p>
          <div className="flex flex-wrap items-center gap-2">
            {showPager ? (
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  上一頁
                </Button>
                {pageItems(safePage, pageCount).map((item, index) =>
                  item === "ellipsis" ? (
                    <span key={`e-${index}`} className="px-1 text-xs text-muted">
                      …
                    </span>
                  ) : (
                    <Button
                      key={item}
                      variant={item === safePage ? "default" : "ghost"}
                      size="sm"
                      className="min-w-8 px-2"
                      aria-current={item === safePage ? "page" : undefined}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </Button>
                  ),
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage(safePage + 1)}
                >
                  下一頁
                </Button>
              </div>
            ) : null}
            <label className="flex items-center gap-1.5 text-xs text-muted">
              每頁
              <NativeSelect
                className="h-8"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                aria-label="每頁列數"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </NativeSelect>
            </label>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
