import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-20 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-muted focus-visible:border-pine focus-visible:ring-2 focus-visible:ring-pine/20 disabled:opacity-55",
        className,
      )}
      {...props}
    />
  );
}
