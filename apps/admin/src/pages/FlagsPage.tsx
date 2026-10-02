import { FeatureFlagKey } from "@spring/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, PageHeader, Switch } from "@/components";
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
    onSuccess: () => {
      toast.success("已更新旗標。");
      void queryClient.invalidateQueries({ queryKey: ["admin-flags"] });
    },
  });
  return (
    <section>
      <PageHeader title="旗標" description="開關只影響手機能力，唔會改模型池或清墨外觀。" />
      <Card className="divide-y divide-line p-0">
        {(flags.data?.items ?? []).map((flag) => {
          const label = LABELS[flag.key] ?? { title: flag.key, note: "" };
          return (
            <div key={flag.key} className="flex items-start justify-between gap-4 px-4 py-4">
              <div>
                <p className="font-medium text-ink">{label.title}</p>
                <p className="text-xs text-muted">{flag.key}</p>
                {label.note ? <p className="mt-1 text-sm text-muted">{label.note}</p> : null}
              </div>
              <Switch
                checked={flag.enabled}
                onCheckedChange={(enabled) => update.mutate({ key: flag.key, enabled })}
              />
            </div>
          );
        })}
        {flags.isLoading ? <p className="px-4 py-6 text-sm text-muted">載入中…</p> : null}
      </Card>
    </section>
  );
}
