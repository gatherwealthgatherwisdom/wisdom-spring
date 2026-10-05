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
    <div className={cn("min-w-0 max-w-[16rem]", className)}>
      <div
        className="truncate leading-snug font-medium text-ink"
        title={typeof title === "string" ? title : undefined}
      >
        {title}
      </div>
      {subtitle ? (
        <div className="mt-0.5 truncate leading-snug text-xs text-muted">{subtitle}</div>
      ) : null}
    </div>
  );
}
