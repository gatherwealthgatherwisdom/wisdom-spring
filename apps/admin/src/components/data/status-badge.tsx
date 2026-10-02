import { Badge } from "@/components/ui/badge";

export function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "ACTIVE" || value === "HK_SAFE" || value === "COMPLETED" || value === "up" || value === "已註冊"
      ? "pine"
      : value === "SUSPENDED" || value === "HK_BLOCKED" || value === "DELETED" || value === "down"
        ? "danger"
        : value === "PLUS" || value === "ADMIN" || value === "INTERNAL"
          ? "ink"
          : "muted";
  return <Badge tone={tone}>{value}</Badge>;
}
