import { Linking, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { mediaUrl } from "./api";

export function fileNameForMedia(url: string, mime?: string): string {
  const id = url.split("/").filter(Boolean).pop()?.split("?")[0] ?? "file";
  const fromMime =
    mime === "application/pdf"
      ? "pdf"
      : mime?.includes("jpeg")
        ? "jpg"
        : mime?.includes("webp")
          ? "webp"
          : mime?.includes("png")
            ? "png"
            : null;
  const fromUrl = /\.(png|jpe?g|webp|pdf)(?:\?|$)/i.exec(url)?.[1]?.toLowerCase() ?? null;
  const ext = fromMime ?? fromUrl ?? "png";
  return `智泉-${id}.${ext}`;
}

function webDownload(blob: Blob, name: string): void {
  const g = globalThis as typeof globalThis & {
    document?: {
      createElement: (tag: "a") => HTMLAnchorElement;
      body: { appendChild: (node: HTMLAnchorElement) => void; removeChild: (node: HTMLAnchorElement) => void };
    };
  };
  if (!g.document) throw new Error("save");
  const href = URL.createObjectURL(blob);
  const link = g.document.createElement("a");
  link.href = href;
  link.download = name;
  g.document.body.appendChild(link);
  link.click();
  g.document.body.removeChild(link);
  URL.revokeObjectURL(href);
}

async function shareLocal(uri: string, name: string, mime?: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: mime,
      dialogTitle: name,
      UTI: mime === "application/pdf" ? "com.adobe.pdf" : undefined,
    });
    return;
  }
  const opened = await Linking.canOpenURL(uri);
  if (!opened) throw new Error("save");
  await Linking.openURL(uri);
}

export async function saveMedia(path: string, mime?: string): Promise<void> {
  const url = mediaUrl(path) ?? path;
  if (Platform.OS === "web") {
    const response = await fetch(url);
    if (!response.ok) throw new Error("save");
    const type = mime ?? response.headers.get("content-type")?.split(";")[0]?.trim() ?? undefined;
    webDownload(await response.blob(), fileNameForMedia(url, type));
    return;
  }
  const name = fileNameForMedia(url, mime);
  if (url.startsWith("file:")) {
    await shareLocal(url, name, mime);
    return;
  }
  const root = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!root) throw new Error("save");
  const dest = `${root}${name}`;
  const result = await FileSystem.downloadAsync(url, dest);
  if (result.status !== 200) throw new Error("save");
  await shareLocal(result.uri, name, mime);
}

export async function openMedia(path: string): Promise<void> {
  const url = mediaUrl(path) ?? path;
  if (Platform.OS === "web") {
    const g = globalThis as typeof globalThis & { open?: (target: string, name: string, features: string) => void };
    g.open?.(url, "_blank", "noopener,noreferrer");
    return;
  }
  await Linking.openURL(url);
}
