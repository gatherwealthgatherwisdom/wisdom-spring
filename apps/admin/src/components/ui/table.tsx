import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-max min-w-full caption-bottom text-sm", className)} {...props} />;
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("group border-b border-line last:border-0 hover:bg-paper/90", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "sticky top-0 z-10 bg-white px-3 py-2.5 text-left align-middle text-xs font-semibold tracking-wide text-muted shadow-[inset_0_-1px_0_0_var(--color-line)] first:sticky first:left-0 first:z-20 first:shadow-[inset_-1px_-1px_0_0_var(--color-line)]",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "px-3 py-3 align-middle first:sticky first:left-0 first:z-[1] first:bg-white first:shadow-[inset_-1px_0_0_0_var(--color-line)] group-hover:first:bg-paper/90",
        className,
      )}
      {...props}
    />
  );
}
