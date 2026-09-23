import { useQuery } from "@tanstack/react-query";
import { client } from "../session";

function dollars(micros: string): string {
  return `$${(Number(micros) / 1_000_000).toFixed(4)}`;
}

export function UsagePage() {
  const usage = useQuery({ queryKey: ["admin-usage"], queryFn: () => client.adminUsage() });
  const data = usage.data;
  return (
    <section>
      <h1>用量</h1>
      {data ? (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <p>區間 {data.from.slice(0, 10)} → {data.to.slice(0, 10)}</p>
            <p>費用 {dollars(data.totals.costUsdMicros)} · 請求 {data.totals.requests}</p>
            <p>tokens {data.totals.promptTokens} / {data.totals.completionTokens}</p>
            <p>地區封鎖率 {(data.totals.regionBlockRate * 100).toFixed(1)}% · 後備率 {(data.totals.fallbackRate * 100).toFixed(1)}%</p>
          </div>
          <div className="card">
            <h2>按模型</h2>
            <table>
              <thead><tr><th>model</th><th>USD</th><th>requests</th></tr></thead>
              <tbody>
                {data.byModel.map((row) => (
                  <tr key={row.model}><td>{row.model}</td><td>{dollars(row.costUsdMicros)}</td><td>{row.requests}</td></tr>
                ))}
              </tbody>
            </table>
            <h2>按計劃</h2>
            <table>
              <thead><tr><th>plan</th><th>USD</th><th>requests</th></tr></thead>
              <tbody>
                {data.byPlan.map((row) => (
                  <tr key={row.planTier}><td>{row.planTier}</td><td>{dollars(row.costUsdMicros)}</td><td>{row.requests}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="muted">載入中…</p>
      )}
    </section>
  );
}
