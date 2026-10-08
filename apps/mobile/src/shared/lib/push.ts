import { pushCopy } from "@spring/shared";
import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";
import { openChatFromPush } from "../../navigation/ref";
import { spring } from "./api";
import { usePrefs } from "./prefs";

const CHANNEL = "spring-default";
const PINE = "#1F6B4A";

function native(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

function conversationIdOf(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const id = (data as { conversationId?: unknown }).conversationId;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

export function configurePush(): void {
  if (!native()) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: "智泉",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: PINE,
    sound: "default",
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
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== "granted") return;
    await ensureChannel();
    const token = (await Notifications.getExpoPushTokenAsync()).data;
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
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: CHANNEL } : {}),
      },
      trigger: null,
    });
  } catch {
    // Missing native module.
  }
}

export function subscribePushResponses(): () => void {
  if (!native()) return () => undefined;
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const conversationId = conversationIdOf(response.notification.request.content.data);
    if (conversationId) openChatFromPush(conversationId);
  });
  return () => sub.remove();
}

export async function openPendingPushChat(): Promise<void> {
  if (!native()) return;
  try {
    const last = await Notifications.getLastNotificationResponseAsync();
    const conversationId = conversationIdOf(last?.notification.request.content.data);
    if (conversationId) openChatFromPush(conversationId);
  } catch {
    // Expo Go without a notification tap.
  }
}
