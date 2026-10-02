import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function NativeSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9 rounded-lg border border-line bg-white px-2.5 text-sm text-ink outline-none transition-colors focus-visible:border-pine focus-visible:ring-2 focus-visible:ring-pine/20 disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
}
