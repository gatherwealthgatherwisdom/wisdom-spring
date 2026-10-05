import { ApiError } from "@spring/api-client";
import { ModelRegionStatus, PlanTier, isAllowlisted, type ModelPoolView, type UpdateModelPoolRequest } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CompactNumber,
  DataTable,
  ErrorAlert,
  FilterField,
  Input,
  NativeSelect,
  PageHeader,
  PrimaryCell,
  StatusBadge,
  Switch,
  TableCell,
  TableRow,
  Toolbar,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components";
import { client } from "../session";

function price(micros: string): string {
  const dollars = Number(micros) / 1_000_000;
  return `$${dollars.toFixed(2)}`;
}

function formatProbe(iso: string | null): string {
  return iso ? iso.slice(0, 16).replace("T", " ") : "未探測";
}

const MODEL_COLUMNS = [
  { key: "model", header: "模型", className: "min-w-[10.5rem]" },
  { key: "kind", header: "能力", className: "whitespace-nowrap" },
  { key: "status", header: "狀態", className: "min-w-[10.5rem]" },
  { key: "weight", header: "權重／質素", className: "min-w-[8.5rem]" },
  { key: "plan", header: "計劃", className: "min-w-[6.75rem]" },
  { key: "stats", header: "24h", align: "right" as const, className: "whitespace-nowrap" },
  { key: "actions", header: "操作", className: "whitespace-nowrap" },
];

export function ModelsPage() {
  const queryClient = useQueryClient();
  const models = useQuery({ queryKey: ["admin-models"], queryFn: () => client.adminModels() });
  const [histogram, setHistogram] = useState<Array<{ slug: string; count: number }>>([]);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanTier>(PlanTier.PLUS);
  const [enabled, setEnabled] = useState<"all" | "on" | "off">("on");
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
      toast.success(`已同步 ${result.upserted} 個目錄。`);
      await refresh();
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "同步失敗。"),
  });

  const probeBatch = useMutation({
    mutationFn: () => client.adminCatalogProbe(),
    onSuccess: async (result) => {
      setError("");
      toast.success(`已探測 ${result.probed} 個模型。`);
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

  const items = models.data?.items ?? [];
  const rows = useMemo(() => {
    const needle = author.trim().toLowerCase();
    return items.filter((row) => {
      if (enabled === "on" && !row.enabled) return false;
      if (enabled === "off" && row.enabled) return false;
      if (region !== "all" && row.regionStatus !== region) return false;
      if (needle && !row.author.toLowerCase().includes(needle) && !row.slug.toLowerCase().includes(needle)) return false;
      if (kind === "image" && !row.supportsImageOutput) return false;
      if (kind === "vision" && !row.supportsVision) return false;
      if (kind === "text" && (row.supportsImageOutput || row.supportsVision)) return false;
      return true;
    });
  }, [items, enabled, region, author, kind]);

  const max = histogram.reduce((peak, item) => Math.max(peak, item.count), 1);

  return (
    <section>
      <PageHeader
        title="模型池"
        description="香港可用名單先可以啟用。唔好開 GPT／Claude／Gemini 畀用戶揀。"
        actions={
          <>
            <Button disabled={sync.isPending} onClick={() => sync.mutate()}>
              {sync.isPending ? "同步中…" : "同步目錄"}
            </Button>
            <Button variant="ghost" disabled={probeBatch.isPending} onClick={() => probeBatch.mutate()}>
              {probeBatch.isPending ? "探測中…" : "探測下一批"}
            </Button>
          </>
        }
      />
      <Toolbar>
        <FilterField label="啟用">
          <NativeSelect
            className="min-w-[8.5rem]"
            value={enabled}
            onChange={(event) => setEnabled(event.target.value as "all" | "on" | "off")}
          >
            <option value="all">全部</option>
            <option value="on">已啟用</option>
            <option value="off">已關閉</option>
          </NativeSelect>
        </FilterField>
        <FilterField label="地區">
          <NativeSelect
            className="min-w-[8.5rem]"
            value={region}
            onChange={(event) => setRegion(event.target.value as "all" | ModelRegionStatus)}
          >
            <option value="all">全部地區</option>
            <option value={ModelRegionStatus.HK_SAFE}>香港可用</option>
            <option value={ModelRegionStatus.UNKNOWN}>未知</option>
            <option value={ModelRegionStatus.HK_BLOCKED}>已封鎖</option>
          </NativeSelect>
        </FilterField>
        <FilterField label="能力">
          <NativeSelect
            className="min-w-[8.5rem]"
            value={kind}
            onChange={(event) => setKind(event.target.value as "all" | "text" | "image" | "vision")}
          >
            <option value="all">全部能力</option>
            <option value="text">文字</option>
            <option value="image">圖像輸出</option>
            <option value="vision">睇圖</option>
          </NativeSelect>
        </FilterField>
        <FilterField label="搜尋" className="min-w-[12rem] flex-1">
          <Input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="作者或 slug"
            className="w-full min-w-[12rem] max-w-sm"
          />
        </FilterField>
      </Toolbar>
      <ErrorAlert message={error} />
      <Card className="mb-4">
        <p className="mb-3 text-[11px] font-medium tracking-wide text-muted">抽籤模擬</p>
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="計劃">
            <NativeSelect
              className="min-w-[8.5rem]"
              value={plan}
              onChange={(event) => setPlan(event.target.value as PlanTier)}
            >
              <option value={PlanTier.FREE}>FREE</option>
              <option value={PlanTier.PLUS}>PLUS</option>
              <option value={PlanTier.INTERNAL}>INTERNAL</option>
            </NativeSelect>
          </FilterField>
          <Button variant="ghost" onClick={() => void simulate()}>
            模擬 100 次
          </Button>
        </div>
        {histogram.length > 0 ? (
          <div className="mt-4 grid max-h-56 gap-2 overflow-auto pr-1">
            {histogram.map((item) => (
              <div className="grid grid-cols-[minmax(140px,240px)_1fr_40px] items-center gap-2 text-sm" key={item.slug}>
                <span className="truncate">{item.slug}</span>
                <span className="block h-2 rounded-full bg-line">
                  <span className="block h-2 rounded-full bg-pine" style={{ width: `${(item.count / max) * 100}%` }} />
                </span>
                <strong className="tabular-nums">{item.count}</strong>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
      <DataTable
        columns={MODEL_COLUMNS}
        loading={models.isLoading}
        empty={!models.isLoading && rows.length === 0 ? "沒有符合篩選的模型。" : null}
        count={rows.length}
        total={items.length}
        resetKey={`${enabled}:${region}:${kind}:${author}`}
      >
        {rows.map((row) => (
          <ModelRow
            key={row.slug}
            row={row}
            onChange={(body) => update.mutate({ slug: row.slug, body })}
            onProbe={() => void client.adminProbe(row.slug).then(refresh)}
          />
        ))}
      </DataTable>
    </section>
  );
}

function capabilityLabel(row: ModelPoolView): string {
  if (row.supportsImageOutput) return "圖像";
  if (row.supportsVision) return "睇圖";
  return "文字";
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
  const allowlisted = isAllowlisted(row.slug);
  const enableLocked = !row.enabled && !allowlisted;

  return (
    <TableRow>
      <TableCell>
        <PrimaryCell title={row.slug} subtitle={row.author} />
      </TableCell>
      <TableCell>
        <Badge tone="cream">{capabilityLabel(row)}</Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Switch
                  checked={row.enabled}
                  disabled={enableLocked}
                  onCheckedChange={(checked) => onChange({ enabled: checked })}
                />
              </span>
            </TooltipTrigger>
            {enableLocked ? <TooltipContent>唔喺香港可用名單</TooltipContent> : null}
          </Tooltip>
          <StatusBadge value={row.regionStatus} />
          <StatusBadge value={row.healthStatus} />
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <CompactNumber
            aria-label="權重"
            value={row.weight}
            min={0}
            max={10_000}
            onCommit={(weight) => onChange({ weight })}
          />
          <CompactNumber
            aria-label="質素"
            value={row.qualityScore}
            min={0}
            max={100}
            onCommit={(qualityScore) => onChange({ qualityScore })}
          />
        </div>
      </TableCell>
      <TableCell>
        <NativeSelect
          className="h-8 w-[6.75rem]"
          value={row.minPlanTier}
          onChange={(event) => onChange({ minPlanTier: event.target.value as PlanTier })}
        >
          <option value={PlanTier.FREE}>FREE</option>
          <option value={PlanTier.PLUS}>PLUS</option>
          <option value={PlanTier.INTERNAL}>INTERNAL</option>
        </NativeSelect>
        <p className="mt-1 text-xs text-muted tabular-nums">{price(row.completionUsdMicrosPerMillion)} / 1M</p>
      </TableCell>
      <TableCell className="whitespace-nowrap text-right">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block cursor-default tabular-nums text-ink">
              {row.success24h}
              <span className="text-muted"> / {row.fail24h}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {row.lastProbeAt ? `上次探測 ${formatProbe(row.lastProbeAt)}` : "未探測"}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 whitespace-nowrap">
          <Button variant="ghost" size="sm" className="px-2.5" onClick={onProbe}>
            探測
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="px-2.5"
            onClick={() => onChange({ regionStatus: ModelRegionStatus.HK_BLOCKED })}
          >
            封鎖
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
