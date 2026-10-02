import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PrimaryCell({
  title,
  subtitle,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="leading-snug font-medium text-ink">{title}</div>
      {subtitle ? <div className="mt-0.5 leading-snug text-xs text-muted">{subtitle}</div> : null}
    </div>
  );
}
