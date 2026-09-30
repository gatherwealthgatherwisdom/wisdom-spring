import { FeatureFlagKey } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../session";

const LABELS: Record<string, { title: string; note: string }> = {
  [FeatureFlagKey.USER_MODEL_PICKER]: {
    title: "用戶模型選擇器",
    note: "開咗都唔出選擇器。手機永遠由池抽籤。",
  },
  [FeatureFlagKey.IMAGE_GEN]: {
    title: "圖像生成",
    note: "關咗之後圖像頁同圖像模式都停。",
  },
  [FeatureFlagKey.VISION]: {
    title: "睇圖",
    note: "關咗之後唔可以上傳相片。",
  },
  [FeatureFlagKey.PDF_UPLOAD]: {
    title: "PDF 上傳",
    note: "關咗之後唔可以傳文件。",
  },
  [FeatureFlagKey.WEB_SEARCH]: {
    title: "網頁搜尋",
    note: "關咗之後搜尋同網頁聊天唔會叫網頁外掛。",
  },
  [FeatureFlagKey.VOICE_UI]: {
    title: "語音介面",
    note: "關咗之後隱藏咪同通話掣。唔包括聲音複製。",
  },
};

export function FlagsPage() {
  const queryClient = useQueryClient();
  const flags = useQuery({ queryKey: ["admin-flags"], queryFn: () => client.adminFlags() });
  const update = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => client.adminUpdateFlag(key, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-flags"] }),
  });
  return (
    <section>
      <h1>旗標</h1>
      <div className="card">
        {(flags.data?.items ?? []).map((flag) => {
          const label = LABELS[flag.key] ?? { title: flag.key, note: "" };
          return (
            <label className="row" key={flag.key} style={{ marginBottom: 14, alignItems: "flex-start" }}>
              <input
                type="checkbox"
                checked={flag.enabled}
                onChange={(event) => update.mutate({ key: flag.key, enabled: event.target.checked })}
              />
              <span>
                <strong>{label.title}</strong>
                <span className="muted"> · {flag.key}</span>
                {label.note ? <div className="note">{label.note}</div> : null}
              </span>
            </label>
          );
        })}
        {flags.isLoading ? <p className="muted">載入中…</p> : null}
      </div>
    </section>
  );
}
