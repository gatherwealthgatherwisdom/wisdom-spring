import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  HK_SAFE: "香港可用",
  UNKNOWN: "未知",
  HK_BLOCKED: "已封鎖",
  HEALTHY: "正常",
  DOWN: "故障",
  DEGRADED: "不穩",
  ACTIVE: "正常",
  SUSPENDED: "已暫停",
  DELETED: "已刪除",
  COMPLETED: "完成",
  FAILED: "失敗",
  PENDING: "進行中",
  STREAMING: "輸出中",
  ABORTED: "已中止",
  ADMIN: "管理員",
  USER: "用戶",
  已註冊: "已註冊",
  訪客: "訪客",
  chat: "對話",
  write: "寫作",
  translate: "翻譯",
  image: "圖像",
  up: "讚",
  down: "踩",
};

const PINE = new Set([
  "ACTIVE",
  "HK_SAFE",
  "HEALTHY",
  "COMPLETED",
  "up",
  "已註冊",
]);
const DANGER = new Set(["SUSPENDED", "HK_BLOCKED", "DELETED", "DOWN", "FAILED", "down"]);
const INK = new Set(["PLUS", "ADMIN", "INTERNAL", "DEGRADED"]);

export function StatusBadge({ value }: { value: string }) {
  const tone = PINE.has(value) ? "pine" : DANGER.has(value) ? "danger" : INK.has(value) ? "ink" : "muted";
  return (
    <Badge tone={tone} title={value}>
      {LABELS[value] ?? value}
    </Badge>
  );
}
