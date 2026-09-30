import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { client } from "../session";

function dollars(micros: string): string {
  return `$${(Number(micros) / 1_000_000).toFixed(4)}`;
}

function currentHkMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

export function UsagePage() {
  const [month, setMonth] = useState(currentHkMonth);
  const usage = useQuery({ queryKey: ["admin-usage", month], queryFn: () => client.adminUsage(month) });
  const data = usage.data;
  return (
    <section>
      <h1>用量</h1>
      <div className="toolbar">
        <label className="row">
          <span className="muted">香港月份</span>
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
      </div>
      {data ? (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <p>
              區間 {data.from.slice(0, 10)} → {data.to.slice(0, 10)}
            </p>
            <p>
              費用 {dollars(data.totals.costUsdMicros)} · 請求 {data.totals.requests}
            </p>
            <p>
              tokens {data.totals.promptTokens} / {data.totals.completionTokens}
            </p>
            <p>
              地區封鎖率 {(data.totals.regionBlockRate * 100).toFixed(1)}% · 後備率{" "}
              {(data.totals.fallbackRate * 100).toFixed(1)}%
            </p>
          </div>
          <div className="card">
            <h2>按模型</h2>
            <table>
              <thead>
                <tr>
                  <th>model</th>
                  <th>USD</th>
                  <th>requests</th>
                </tr>
              </thead>
              <tbody>
                {data.byModel.map((row) => (
                  <tr key={row.model}>
                    <td>{row.model}</td>
                    <td>{dollars(row.costUsdMicros)}</td>
                    <td>{row.requests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h2>按計劃</h2>
            <table>
              <thead>
                <tr>
                  <th>plan</th>
                  <th>USD</th>
                  <th>requests</th>
                </tr>
              </thead>
              <tbody>
                {data.byPlan.map((row) => (
                  <tr key={row.planTier}>
                    <td>{row.planTier}</td>
                    <td>{dollars(row.costUsdMicros)}</td>
                    <td>{row.requests}</td>
                  </tr>
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
