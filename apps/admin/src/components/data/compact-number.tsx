import { useEffect, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function CompactNumber({
  value,
  onCommit,
  min,
  max,
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  "aria-label"?: string;
}) {
  const [raw, setRaw] = useState(String(value));
  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  function commit() {
    const next = Number(raw);
    if (!Number.isFinite(next) || !Number.isInteger(next)) {
      setRaw(String(value));
      return;
    }
    const clamped = Math.max(min ?? next, Math.min(max ?? next, next));
    setRaw(String(clamped));
    if (clamped !== value) onCommit(clamped);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.currentTarget.blur();
  }

  return (
    <Input
      type="number"
      min={min}
      max={max}
      value={raw}
      onChange={(event) => setRaw(event.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      aria-label={ariaLabel}
      className={cn("h-8 w-16 px-2 text-right tabular-nums", className)}
    />
  );
}
