import { ErrorCode } from "../enums/error-code";
import { Locale } from "../enums/locale";
import { messageFor } from "../constants/messages";

const STATUS: Record<ErrorCode, number> = {
  [ErrorCode.AUTH_INVALID]: 401,
  [ErrorCode.AUTH_EXPIRED]: 401,
  [ErrorCode.USER_SUSPENDED]: 403,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.QUOTA_DAILY_MESSAGE]: 429,
  [ErrorCode.QUOTA_MONTHLY_COST]: 402,
  [ErrorCode.MODEL_POOL_EMPTY]: 503,
  [ErrorCode.UPSTREAM_REGION_BLOCKED]: 502,
  [ErrorCode.UPSTREAM_RATE_LIMITED]: 429,
  [ErrorCode.UPSTREAM_UNAVAILABLE]: 502,
  [ErrorCode.STREAM_ABORTED]: 499,
  [ErrorCode.VALIDATION]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.INTERNAL]: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;

  constructor(code: ErrorCode, message?: string, statusCode?: number) {
    super(message ?? messageFor(code, Locale.ZH_HK));
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode ?? STATUS[code];
  }
}

export function errorBody(error: AppError): { error: { code: ErrorCode; message: string } } {
  return { error: { code: error.code, message: error.message } };
}
