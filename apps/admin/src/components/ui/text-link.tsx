import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";

export function TextLink({ className, ...props }: LinkProps) {
  return <Link className={cn("text-pine hover:underline", className)} {...props} />;
}
