import { ApiError } from "@spring/api-client";
import { microsToUsd, usdToMicros, type AdminLimits, type UpdateLimitsRequest } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { client } from "../session";

type Draft = {
  guestTrialMessages: string;
  freeDailyMessages: string;
  plusDailyMessages: string;
  internalDailyMessages: string;
  freeMonthlyUsd: string;
  plusMonthlyUsd: string;
  internalMonthlyUsd: string;
  freeMaxPromptUsd: string;
  freeMaxCompletionUsd: string;
  uploadMb: string;
  historyMaxMessages: string;
};

function fromLimits(data: AdminLimits): Draft {
  return {
    guestTrialMessages: String(data.guestTrialMessages),
    freeDailyMessages: String(data.freeDailyMessages),
    plusDailyMessages: String(data.plusDailyMessages),
    internalDailyMessages: String(data.internalDailyMessages),
    freeMonthlyUsd: microsToUsd(String(data.freeMonthlyUsdMicros)),
    plusMonthlyUsd: microsToUsd(String(data.plusMonthlyUsdMicros)),
    internalMonthlyUsd: microsToUsd(String(data.internalMonthlyUsdMicros)),
    freeMaxPromptUsd: microsToUsd(String(data.freeMaxPromptUsdMicrosPerMillion)),
    freeMaxCompletionUsd: microsToUsd(String(data.freeMaxCompletionUsdMicrosPerMillion)),
    uploadMb: (data.uploadMaxBytes / (1024 * 1024)).toString(),
    historyMaxMessages: String(data.historyMaxMessages),
  };
}

function intField(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function usdField(value: string, fallbackMicros: number): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallbackMicros;
  return Number(usdToMicros(parsed));
}

function toPatch(draft: Draft, current: AdminLimits): UpdateLimitsRequest {
  return {
    guestTrialMessages: intField(draft.guestTrialMessages, current.guestTrialMessages),
    freeDailyMessages: intField(draft.freeDailyMessages, current.freeDailyMessages),
    plusDailyMessages: intField(draft.plusDailyMessages, current.plusDailyMessages),
    internalDailyMessages: intField(draft.internalDailyMessages, current.internalDailyMessages),
    freeMonthlyUsdMicros: usdField(draft.freeMonthlyUsd, current.freeMonthlyUsdMicros),
    plusMonthlyUsdMicros: usdField(draft.plusMonthlyUsd, current.plusMonthlyUsdMicros),
    internalMonthlyUsdMicros: usdField(draft.internalMonthlyUsd, current.internalMonthlyUsdMicros),
    freeMaxPromptUsdMicrosPerMillion: usdField(draft.freeMaxPromptUsd, current.freeMaxPromptUsdMicrosPerMillion),
    freeMaxCompletionUsdMicrosPerMillion: usdField(
      draft.freeMaxCompletionUsd,
      current.freeMaxCompletionUsdMicrosPerMillion,
    ),
    uploadMaxBytes: Math.round(Number.parseFloat(draft.uploadMb || "0") * 1024 * 1024) || current.uploadMaxBytes,
    historyMaxMessages: intField(draft.historyMaxMessages, current.historyMaxMessages),
  };
}

export function QuotasPage() {
  const queryClient = useQueryClient();
  const limits = useQuery({ queryKey: ["admin-limits"], queryFn: () => client.adminLimits() });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (limits.data) setDraft(fromLimits(limits.data));
  }, [limits.data]);

  const save = useMutation({
    mutationFn: (body: UpdateLimitsRequest) => client.adminUpdateLimits(body),
    onSuccess: async (data) => {
      setError("");
      setDraft(fromLimits(data));
      await queryClient.invalidateQueries({ queryKey: ["admin-limits"] });
    },
    onError: (caught) => setError(caught instanceof ApiError ? caught.message : "儲存失敗。"),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft || !limits.data) return;
    save.mutate(toPatch(draft, limits.data));
  }

  function set<K extends keyof Draft>(key: K, value: string) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <section>
      <h1>配額</h1>
      <p className="note" style={{ marginTop: -8, marginBottom: 16 }}>
        數字即時影響訪客次數、每日上限、FREE 單價 cap、上傳同歷史。
      </p>
      {error ? <p className="error">{error}</p> : null}
      {draft ? (
        <form className="card" onSubmit={onSubmit} style={{ display: "grid", gap: 18, maxWidth: 640 }}>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <h2>訪客</h2>
            <label className="row">
              <span style={{ minWidth: 140 }}>試用次數</span>
              <input
                type="number"
                min={0}
                max={100}
                style={{ width: 120 }}
                value={draft.guestTrialMessages}
                onChange={(event) => set("guestTrialMessages", event.target.value)}
              />
            </label>
          </fieldset>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <h2>FREE</h2>
            <label className="row">
              <span style={{ minWidth: 140 }}>每日次數</span>
              <input
                type="number"
                min={1}
                max={100000}
                style={{ width: 120 }}
                value={draft.freeDailyMessages}
                onChange={(event) => set("freeDailyMessages", event.target.value)}
              />
            </label>
            <label className="row">
              <span style={{ minWidth: 140 }}>每月 USD</span>
              <input
                type="text"
                inputMode="decimal"
                style={{ width: 120 }}
                value={draft.freeMonthlyUsd}
                onChange={(event) => set("freeMonthlyUsd", event.target.value)}
              />
            </label>
            <label className="row">
              <span style={{ minWidth: 140 }}>prompt / 1M USD</span>
              <input
                type="text"
                inputMode="decimal"
                style={{ width: 120 }}
                value={draft.freeMaxPromptUsd}
                onChange={(event) => set("freeMaxPromptUsd", event.target.value)}
              />
            </label>
            <label className="row">
              <span style={{ minWidth: 140 }}>completion / 1M USD</span>
              <input
                type="text"
                inputMode="decimal"
                style={{ width: 120 }}
                value={draft.freeMaxCompletionUsd}
                onChange={(event) => set("freeMaxCompletionUsd", event.target.value)}
              />
            </label>
          </fieldset>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <h2>PLUS</h2>
            <label className="row">
              <span style={{ minWidth: 140 }}>每日次數</span>
              <input
                type="number"
                min={1}
                max={100000}
                style={{ width: 120 }}
                value={draft.plusDailyMessages}
                onChange={(event) => set("plusDailyMessages", event.target.value)}
              />
            </label>
            <label className="row">
              <span style={{ minWidth: 140 }}>每月 USD</span>
              <input
                type="text"
                inputMode="decimal"
                style={{ width: 120 }}
                value={draft.plusMonthlyUsd}
                onChange={(event) => set("plusMonthlyUsd", event.target.value)}
              />
            </label>
          </fieldset>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <h2>INTERNAL</h2>
            <label className="row">
              <span style={{ minWidth: 140 }}>每日次數</span>
              <input
                type="number"
                min={1}
                max={100000}
                style={{ width: 120 }}
                value={draft.internalDailyMessages}
                onChange={(event) => set("internalDailyMessages", event.target.value)}
              />
            </label>
            <label className="row">
              <span style={{ minWidth: 140 }}>每月 USD</span>
              <input
                type="text"
                inputMode="decimal"
                style={{ width: 120 }}
                value={draft.internalMonthlyUsd}
                onChange={(event) => set("internalMonthlyUsd", event.target.value)}
              />
            </label>
          </fieldset>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <h2>上傳同歷史</h2>
            <label className="row">
              <span style={{ minWidth: 140 }}>上傳上限 MB</span>
              <input
                type="text"
                inputMode="decimal"
                style={{ width: 120 }}
                value={draft.uploadMb}
                onChange={(event) => set("uploadMb", event.target.value)}
              />
            </label>
            <label className="row">
              <span style={{ minWidth: 140 }}>歷史條數</span>
              <input
                type="number"
                min={1}
                max={200}
                style={{ width: 120 }}
                value={draft.historyMaxMessages}
                onChange={(event) => set("historyMaxMessages", event.target.value)}
              />
            </label>
          </fieldset>
          <div>
            <button className="btn" type="submit" disabled={save.isPending}>
              {save.isPending ? "儲存中…" : "儲存"}
            </button>
          </div>
        </form>
      ) : (
        <p className="muted">載入中…</p>
      )}
    </section>
  );
}
