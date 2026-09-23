import { ApiError } from "@spring/api-client";
import { ModelRegionStatus, PlanTier, type ModelPoolView } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { client } from "../session";

function price(micros: string): string {
  const dollars = Number(micros) / 1_000_000;
  return `$${dollars.toFixed(2)}`;
}

export function ModelsPage() {
  const queryClient = useQueryClient();
  const models = useQuery({ queryKey: ["admin-models"], queryFn: () => client.adminModels() });
  const [histogram, setHistogram] = useState<Array<{ slug: string; count: number }>>([]);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanTier>(PlanTier.PLUS);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-models"] });
  };

  const update = useMutation({
    mutationFn: ({ slug, body }: { slug: string; body: Parameters<typeof client.adminUpdateModel>[1] }) =>
      client.adminUpdateModel(slug, body),
    onSuccess: refresh,
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "更新失敗。"),
  });

  async function simulate() {
    setError("");
    try {
      const result = await client.adminSimulate({ planTier: plan, draws: 100 });
      setHistogram(result.histogram);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "模擬失敗。");
    }
  }

  const max = histogram.reduce((peak, item) => Math.max(peak, item.count), 1);

  return (
    <section>
      <h1>模型池</h1>
      <div className="row" style={{ marginBottom: 16 }}>
        <select value={plan} onChange={(event) => setPlan(event.target.value as PlanTier)}>
          <option value={PlanTier.FREE}>FREE</option>
          <option value={PlanTier.PLUS}>PLUS</option>
          <option value={PlanTier.INTERNAL}>INTERNAL</option>
        </select>
        <button className="btn" type="button" onClick={() => void simulate()}>模擬抽籤 100 次</button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {histogram.length > 0 ? (
        <div className="card bars" style={{ marginBottom: 16 }}>
          {histogram.map((item) => (
            <div className="bar" key={item.slug}>
              <span>{item.slug}</span>
              <i style={{ width: `${(item.count / max) * 100}%` }} />
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      ) : null}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>slug</th>
              <th>author</th>
              <th>enabled</th>
              <th>region</th>
              <th>health</th>
              <th>weight</th>
              <th>quality</th>
              <th>plan</th>
              <th>out / 1M</th>
              <th>24h</th>
              <th>probe</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(models.data?.items ?? []).map((row) => (
              <ModelRow key={row.slug} row={row} onChange={(body) => update.mutate({ slug: row.slug, body })} onProbe={() => void client.adminProbe(row.slug).then(refresh)} />
            ))}
          </tbody>
        </table>
        {models.isLoading ? <p className="muted">載入中…</p> : null}
      </div>
    </section>
  );
}

function ModelRow({
  row,
  onChange,
  onProbe,
}: {
  row: ModelPoolView;
  onChange: (body: { enabled?: boolean; regionStatus?: ModelRegionStatus }) => void;
  onProbe: () => void;
}) {
  return (
    <tr>
      <td>{row.slug}</td>
      <td>{row.author}</td>
      <td>
        <input type="checkbox" checked={row.enabled} onChange={(event) => onChange({ enabled: event.target.checked })} />
      </td>
      <td>{row.regionStatus}</td>
      <td>{row.healthStatus}</td>
      <td>{row.weight}</td>
      <td>{row.qualityScore}</td>
      <td>{row.minPlanTier}</td>
      <td>{price(row.completionUsdMicrosPerMillion)}</td>
      <td>{row.success24h}/{row.fail24h}</td>
      <td>{row.lastProbeAt ? row.lastProbeAt.slice(0, 16).replace("T", " ") : "—"}</td>
      <td className="row">
        <button className="btn ghost" type="button" onClick={onProbe}>探測</button>
        <button className="btn danger" type="button" onClick={() => onChange({ regionStatus: ModelRegionStatus.HK_BLOCKED })}>封鎖</button>
      </td>
    </tr>
  );
}
