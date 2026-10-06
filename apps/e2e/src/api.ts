import { DEV_PHONE_CODE } from "@spring/shared";
import { expect, type APIRequestContext, type APIResponse } from "@playwright/test";

export const API = "http://127.0.0.1:3000";

export async function api(
  request: APIRequestContext,
  method: string,
  path: string,
  options: { data?: unknown; token?: string | null; headers?: Record<string, string> } = {},
): Promise<APIResponse> {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.data !== undefined && headers["Content-Type"] === undefined) {
    headers["Content-Type"] = "application/json";
  }
  return request.fetch(`${API}${path}`, {
    method,
    headers,
    data: options.data as string | Buffer | object | undefined,
  });
}

export async function expectError(response: APIResponse, status: number, code: string): Promise<void> {
  const text = await response.text();
  expect(response.status(), text).toBe(status);
  const body = JSON.parse(text) as { error?: { code?: string } };
  expect(body.error?.code).toBe(code);
}

export async function phoneLogin(
  request: APIRequestContext,
  phone: string,
  code = DEV_PHONE_CODE,
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: { id: string; role: string; planTier: string; phone?: string | null };
}> {
  const requested = await api(request, "POST", "/v1/auth/phone/request", { data: { phone } });
  const requestedText = await requested.text();
  expect(requested.ok(), requestedText).toBeTruthy();
  const verified = await api(request, "POST", "/v1/auth/phone/verify", { data: { phone, code } });
  const verifiedText = await verified.text();
  expect(verified.ok(), verifiedText).toBeTruthy();
  return JSON.parse(verifiedText) as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; role: string; planTier: string; phone?: string | null };
  };
}
