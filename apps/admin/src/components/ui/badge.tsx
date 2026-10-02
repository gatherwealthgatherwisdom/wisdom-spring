import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide",
  {
    variants: {
      tone: {
        pine: "bg-pine/10 text-pine",
        ink: "bg-ink/8 text-ink",
        muted: "bg-line text-muted",
        danger: "bg-danger/10 text-danger",
        cream: "bg-cream text-ink",
      },
    },
    defaultVariants: { tone: "muted" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
