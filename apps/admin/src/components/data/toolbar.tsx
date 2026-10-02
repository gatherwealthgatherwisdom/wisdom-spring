import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Toolbar({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-wrap items-end gap-3", className)} {...props} />;
}

export function FilterField({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("grid gap-1", className)}>
      <span className="text-[11px] font-medium tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}
