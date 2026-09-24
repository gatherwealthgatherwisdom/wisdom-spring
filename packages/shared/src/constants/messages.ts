import { ErrorCode } from "../enums/error-code";
import { Locale } from "../enums/locale";

export const ERROR_MESSAGES: Record<Locale, Record<ErrorCode, string>> = {
  [Locale.ZH_HK]: {
    [ErrorCode.AUTH_INVALID]: "登入資料不正確。",
    [ErrorCode.AUTH_EXPIRED]: "登入已過期，請再登入。",
    [ErrorCode.USER_SUSPENDED]: "呢個帳戶已暫停。",
    [ErrorCode.FORBIDDEN]: "沒有權限。",
    [ErrorCode.QUOTA_DAILY_MESSAGE]: "今日對話次數已用完。",
    [ErrorCode.QUOTA_MONTHLY_COST]: "本月用量已達上限。",
    [ErrorCode.QUOTA_GUEST]: "試用 5 次已用完。完成註冊後可以繼續用。",
    [ErrorCode.MODEL_POOL_EMPTY]: "暫時沒有可用模型，請稍後再試。",
    [ErrorCode.UPSTREAM_REGION_BLOCKED]: "呢個模型暫時唔支援香港地區，已自動換過。",
    [ErrorCode.UPSTREAM_RATE_LIMITED]: "系統繁忙，請稍後再試。",
    [ErrorCode.UPSTREAM_UNAVAILABLE]: "智泉暫時回應唔到，請稍後再試。",
    [ErrorCode.STREAM_ABORTED]: "已停止生成。",
    [ErrorCode.VALIDATION]: "輸入格式不正確。",
    [ErrorCode.NOT_FOUND]: "找不到相關內容。",
    [ErrorCode.CONFLICT]: "請勿重複提交。",
    [ErrorCode.INTERNAL]: "智泉暫時回應唔到，請稍後再試。",
  },
  [Locale.EN]: {
    [ErrorCode.AUTH_INVALID]: "Those sign-in details are not valid.",
    [ErrorCode.AUTH_EXPIRED]: "Your session has expired. Please sign in again.",
    [ErrorCode.USER_SUSPENDED]: "This account is suspended.",
    [ErrorCode.FORBIDDEN]: "You do not have access.",
    [ErrorCode.QUOTA_DAILY_MESSAGE]: "You have used today's messages.",
    [ErrorCode.QUOTA_MONTHLY_COST]: "This month's usage limit has been reached.",
    [ErrorCode.QUOTA_GUEST]: "The 5 trial uses are finished. Register to continue.",
    [ErrorCode.MODEL_POOL_EMPTY]: "No model is available right now. Please try again later.",
    [ErrorCode.UPSTREAM_REGION_BLOCKED]: "That model is not available in Hong Kong. Another was used.",
    [ErrorCode.UPSTREAM_RATE_LIMITED]: "The system is busy. Please try again shortly.",
    [ErrorCode.UPSTREAM_UNAVAILABLE]: "Wisdom Spring cannot reply right now. Please try again later.",
    [ErrorCode.STREAM_ABORTED]: "Generation stopped.",
    [ErrorCode.VALIDATION]: "That input is not valid.",
    [ErrorCode.NOT_FOUND]: "We could not find that.",
    [ErrorCode.CONFLICT]: "This request was already submitted.",
    [ErrorCode.INTERNAL]: "Wisdom Spring cannot reply right now. Please try again later.",
  },
};

export function messageFor(code: ErrorCode, locale: Locale = Locale.ZH_HK): string {
  return ERROR_MESSAGES[locale][code];
}
