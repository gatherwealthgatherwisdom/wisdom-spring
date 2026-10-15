import { expoProjectIdFromExtra, expoPushTokenRequest, pushCopy } from "@spring/shared";
import * as Notifications from "expo-notifications";
import appJson from "../../../app.json";
import { AppState, Platform } from "react-native";
import { openChatFromPush, openNoticesFromPush, openSettingsFromPush } from "../../navigation/ref";
import { spring } from "./api";
import { maybeShowLiveOtp, otpCodeOf, useOtpPrompt } from "./otp-prompt";
import { usePrefs } from "./prefs";

const CHANNEL = "spring-default";
const PINE = "#1F6B4A";

function native(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

function asRecord(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  return data as Record<string, unknown>;
}

function kindOf(data: unknown): string | undefined {
  const kind = asRecord(data)?.kind;
  return typeof kind === "string" ? kind : undefined;
}

function conversationIdOf(data: unknown): string | undefined {
  const id = asRecord(data)?.conversationId;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

function noticeIdOf(data: unknown): string | undefined {
  const id = asRecord(data)?.noticeId;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

export function configurePush(): void {
  if (!native()) return;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const otp = kindOf(notification.request.content.data) === "otp";
      return {
        shouldShowBanner: !otp,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      };
    },
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: "智泉",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: PINE,
  });
}

export async function requestPushPermission(): Promise<boolean> {
  if (!native()) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    const status =
      existing.status === "granted" ? existing.status : (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return false;
    await ensureChannel();
    return true;
  } catch {
    return false;
  }
}

export async function registerPushDevice(): Promise<void> {
  if (!native() || !usePrefs.getState().accessToken) return;
  try {
    const granted = await requestPushPermission();
    if (!granted) return;
    const token = (
      await Notifications.getExpoPushTokenAsync(
        expoPushTokenRequest(expoProjectIdFromExtra(appJson.expo.extra)),
      )
    ).data;
    const platform = Platform.OS === "ios" ? "ios" : "android";
    await spring.registerDevice({ token, platform });
    usePrefs.getState().setPushToken(token);
  } catch {
    // Expo Go and web have no remote Expo token.
  }
}

export async function unregisterPushDevice(): Promise<void> {
  const token = usePrefs.getState().pushToken;
  if (!token || !usePrefs.getState().accessToken) return;
  await spring.unregisterDevice({ token }).catch(() => undefined);
}

export async function notifyGenerationDoneLocal(conversationId: string): Promise<void> {
  if (!native() || AppState.currentState === "active") return;
  if (usePrefs.getState().user?.notifyGenerationDone === false) return;
  const copy = pushCopy(usePrefs.getState().locale);
  try {
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: copy.generationDoneTitle,
        body: copy.generationDoneBody,
        data: { kind: "generation_done", conversationId },
        sound: true,
        ...(Platform.OS === "android" ? { channelId: CHANNEL } : {}),
      },
      trigger: null,
    });
  } catch {
    // Missing native module.
  }
}

function handlePushPayload(data: unknown, body?: string): void {
  const kind = kindOf(data);
  const conversationId = conversationIdOf(data);
  if (kind === "otp") {
    const code = otpCodeOf({ kind, body, data: asRecord(data) });
    if (code) useOtpPrompt.getState().show(code, noticeIdOf(data));
    else openNoticesFromPush();
    return;
  }
  if (kind === "generation_done" && conversationId) {
    openChatFromPush(conversationId);
    return;
  }
  if (kind === "quota_low" || kind === "quota_exhausted" || kind === "monthly_cost") {
    openSettingsFromPush();
    return;
  }
  if (conversationId) {
    openChatFromPush(conversationId);
    return;
  }
  if (kind === "admin") openNoticesFromPush();
}

export function subscribePushResponses(): () => void {
  if (!native()) return () => undefined;
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const content = response.notification.request.content;
    handlePushPayload(content.data, content.body ?? undefined);
  });
  return () => sub.remove();
}

export function subscribePushReceived(onAny?: () => void): () => void {
  if (!native()) return () => undefined;
  const sub = Notifications.addNotificationReceivedListener((notification) => {
    const content = notification.request.content;
    if (kindOf(content.data) === "otp") {
      handlePushPayload(content.data, content.body ?? undefined);
    }
    onAny?.();
  });
  return () => sub.remove();
}

export async function refreshInboxNotices(): Promise<void> {
  if (!usePrefs.getState().accessToken) return;
  try {
    const data = await spring.inbox();
    maybeShowLiveOtp(data.items);
  } catch {
    // Signed-out or offline.
  }
}

export async function openPendingPushChat(): Promise<void> {
  if (!native()) return;
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    const content = last?.notification.request.content;
    if (content) handlePushPayload(content.data, content.body ?? undefined);
  } catch {
    // Expo Go without a notification tap.
  }
}
