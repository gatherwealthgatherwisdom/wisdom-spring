import { Badge } from "@/components/ui/badge";

export function CellChips({ items }: { items: Array<string | null | undefined> }) {
  const shown = items.filter((item): item is string => Boolean(item));
  if (shown.length === 0) return <span className="text-muted">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((item) => (
        <Badge key={item} tone="cream">
          {item}
        </Badge>
      ))}
    </div>
  );
}
