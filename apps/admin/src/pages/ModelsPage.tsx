import { ApiError } from "@spring/api-client";
import { ModelRegionStatus, PlanTier, isAllowlisted, type ModelPoolView, type UpdateModelPoolRequest } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState<PlanTier>(PlanTier.PLUS);
  const [enabled, setEnabled] = useState<"all" | "on" | "off">("all");
  const [region, setRegion] = useState<"all" | ModelRegionStatus>("all");
  const [author, setAuthor] = useState("");
  const [kind, setKind] = useState<"all" | "text" | "image" | "vision">("all");

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-models"] });
  };

  const update = useMutation({
    mutationFn: ({ slug, body }: { slug: string; body: UpdateModelPoolRequest }) => client.adminUpdateModel(slug, body),
    onSuccess: () => {
      setError("");
      void refresh();
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "更新失敗。"),
  });

  const sync = useMutation({
    mutationFn: () => client.adminCatalogSync(),
    onSuccess: async (result) => {
      setError("");
      setNote(`已同步 ${result.upserted} 個目錄。`);
      await refresh();
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "同步失敗。"),
  });

  const probeBatch = useMutation({
    mutationFn: () => client.adminCatalogProbe(),
    onSuccess: async (result) => {
      setError("");
      setNote(`已探測 ${result.probed} 個模型。`);
      await refresh();
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "探測失敗。"),
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

  const rows = useMemo(() => {
    const needle = author.trim().toLowerCase();
    return (models.data?.items ?? []).filter((row) => {
      if (enabled === "on" && !row.enabled) return false;
      if (enabled === "off" && row.enabled) return false;
      if (region !== "all" && row.regionStatus !== region) return false;
      if (needle && !row.author.toLowerCase().includes(needle) && !row.slug.toLowerCase().includes(needle)) return false;
      if (kind === "image" && !row.supportsImageOutput) return false;
      if (kind === "vision" && !row.supportsVision) return false;
      if (kind === "text" && (row.supportsImageOutput || row.supportsVision)) return false;
      return true;
    });
  }, [models.data?.items, enabled, region, author, kind]);

  const max = histogram.reduce((peak, item) => Math.max(peak, item.count), 1);

  return (
    <section>
      <h1>模型池</h1>
      <div className="toolbar">
        <button className="btn" type="button" disabled={sync.isPending} onClick={() => sync.mutate()}>
          {sync.isPending ? "同步中…" : "同步目錄"}
        </button>
        <button className="btn ghost" type="button" disabled={probeBatch.isPending} onClick={() => probeBatch.mutate()}>
          {probeBatch.isPending ? "探測中…" : "探測下一批"}
        </button>
        <select value={plan} onChange={(event) => setPlan(event.target.value as PlanTier)}>
          <option value={PlanTier.FREE}>FREE</option>
          <option value={PlanTier.PLUS}>PLUS</option>
          <option value={PlanTier.INTERNAL}>INTERNAL</option>
        </select>
        <button className="btn ghost" type="button" onClick={() => void simulate()}>
          模擬抽籤 100 次
        </button>
      </div>
      <div className="toolbar">
        <select value={enabled} onChange={(event) => setEnabled(event.target.value as "all" | "on" | "off")}>
          <option value="all">全部啟用狀態</option>
          <option value="on">已啟用</option>
          <option value="off">已關閉</option>
        </select>
        <select value={region} onChange={(event) => setRegion(event.target.value as "all" | ModelRegionStatus)}>
          <option value="all">全部地區</option>
          <option value={ModelRegionStatus.HK_SAFE}>HK_SAFE</option>
          <option value={ModelRegionStatus.UNKNOWN}>UNKNOWN</option>
          <option value={ModelRegionStatus.HK_BLOCKED}>HK_BLOCKED</option>
        </select>
        <select value={kind} onChange={(event) => setKind(event.target.value as "all" | "text" | "image" | "vision")}>
          <option value="all">全部能力</option>
          <option value="text">文字</option>
          <option value="image">圖像輸出</option>
          <option value="vision">睇圖</option>
        </select>
        <input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="作者或 slug" />
      </div>
      {error ? <p className="error">{error}</p> : null}
      {note ? <p className="note">{note}</p> : null}
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
              <th>out</th>
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
            {rows.map((row) => (
              <ModelRow
                key={row.slug}
                row={row}
                onChange={(body) => update.mutate({ slug: row.slug, body })}
                onProbe={() => void client.adminProbe(row.slug).then(refresh)}
              />
            ))}
          </tbody>
        </table>
        {models.isLoading ? <p className="muted">載入中…</p> : null}
        {!models.isLoading && rows.length === 0 ? <p className="muted">沒有符合篩選的模型。</p> : null}
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
  onChange: (body: UpdateModelPoolRequest) => void;
  onProbe: () => void;
}) {
  const [weight, setWeight] = useState(String(row.weight));
  const [quality, setQuality] = useState(String(row.qualityScore));
  useEffect(() => {
    setWeight(String(row.weight));
    setQuality(String(row.qualityScore));
  }, [row.weight, row.qualityScore]);
  const allowlisted = isAllowlisted(row.slug);
  const out = row.supportsImageOutput ? "圖像" : row.supportsVision ? "睇圖" : "文字";

  function commitNumber(kind: "weight" | "qualityScore", raw: string, current: number) {
    const value = Number(raw);
    if (!Number.isFinite(value) || !Number.isInteger(value) || value === current) return;
    if (kind === "weight") onChange({ weight: Math.max(0, Math.min(10_000, value)) });
    else onChange({ qualityScore: Math.max(0, Math.min(100, value)) });
  }

  return (
    <tr>
      <td>{row.slug}</td>
      <td>{row.author}</td>
      <td>{out}</td>
      <td>
        <input
          type="checkbox"
          checked={row.enabled}
          disabled={!row.enabled && !allowlisted}
          title={allowlisted ? undefined : "唔喺香港可用名單"}
          onChange={(event) => onChange({ enabled: event.target.checked })}
        />
      </td>
      <td>{row.regionStatus}</td>
      <td>{row.healthStatus}</td>
      <td>
        <input
          type="number"
          min={0}
          max={10_000}
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          onBlur={() => commitNumber("weight", weight, row.weight)}
        />
      </td>
      <td>
        <input
          type="number"
          min={0}
          max={100}
          value={quality}
          onChange={(event) => setQuality(event.target.value)}
          onBlur={() => commitNumber("qualityScore", quality, row.qualityScore)}
        />
      </td>
      <td>
        <select value={row.minPlanTier} onChange={(event) => onChange({ minPlanTier: event.target.value as PlanTier })}>
          <option value={PlanTier.FREE}>FREE</option>
          <option value={PlanTier.PLUS}>PLUS</option>
          <option value={PlanTier.INTERNAL}>INTERNAL</option>
        </select>
      </td>
      <td>{price(row.completionUsdMicrosPerMillion)}</td>
      <td>
        {row.success24h}/{row.fail24h}
      </td>
      <td>{row.lastProbeAt ? row.lastProbeAt.slice(0, 16).replace("T", " ") : "—"}</td>
      <td className="row">
        <button className="btn ghost" type="button" onClick={onProbe}>
          探測
        </button>
        <button className="btn danger" type="button" onClick={() => onChange({ regionStatus: ModelRegionStatus.HK_BLOCKED })}>
          封鎖
        </button>
      </td>
    </tr>
  );
}
