export function searchNeedle(value: string | undefined): string {
  return (value ?? "").trim().replace(/[%_\\]/g, "").slice(0, 200);
}
