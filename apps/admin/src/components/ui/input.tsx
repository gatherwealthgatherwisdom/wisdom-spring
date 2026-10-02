import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "h-9 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus-visible:border-pine focus-visible:ring-2 focus-visible:ring-pine/20 disabled:opacity-55",
        type === "number" && "w-24",
        className,
      )}
      {...props}
    />
  );
}
