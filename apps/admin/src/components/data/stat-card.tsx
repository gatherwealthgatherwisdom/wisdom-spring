import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card className="min-w-[160px] flex-1">
      <p className="text-xs tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-serif text-2xl text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}
