import type { ConversationView, MessageView } from "@spring/shared";
import * as FileSystem from "expo-file-system/legacy";

const localByUrl = new Map<string, string>();

export function localMediaUri(path: string | null | undefined): string | null {
  if (!path) return null;
  return localByUrl.get(path) ?? null;
}

export function rememberMedia(url: string, localPath: string): void {
  localByUrl.set(url, localPath);
}

export function clearMediaMap(): void {
  localByUrl.clear();
}

export function hydrateMediaMap(entries: Array<{ url: string; localPath: string }>): void {
  localByUrl.clear();
  for (const entry of entries) localByUrl.set(entry.url, entry.localPath);
}

function fileNameFor(url: string): string {
  let hash = 0;
  for (const char of url) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  const ext = /\.(png|jpe?g|webp)(?:\?|$)/i.exec(url)?.[1]?.toLowerCase() ?? "img";
  return `${Math.abs(hash).toString(16)}.${ext}`;
}

export async function cacheMediaUrls(urls: string[], download: (url: string, dest: string) => Promise<string | null>): Promise<Array<{ url: string; localPath: string }>> {
  const root = FileSystem.documentDirectory;
  if (!root) return [];
  const dir = `${root}spring-media/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
  const saved: Array<{ url: string; localPath: string }> = [];
  for (const url of urls) {
    if (!url || localByUrl.has(url)) continue;
    const dest = `${dir}${fileNameFor(url)}`;
    const info = await FileSystem.getInfoAsync(dest);
    if (info.exists) {
      rememberMedia(url, dest);
      saved.push({ url, localPath: dest });
      continue;
    }
    const localPath = await download(url, dest);
    if (!localPath) continue;
    rememberMedia(url, localPath);
    saved.push({ url, localPath });
  }
  return saved;
}

export function mediaUrlsOf(conversations: ConversationView[], messages: MessageView[]): string[] {
  const urls = new Set<string>();
  for (const item of conversations) {
    if (item.lastImageUrl) urls.add(item.lastImageUrl);
  }
  for (const message of messages) {
    if (message.imageUrl) urls.add(message.imageUrl);
    for (const attachment of message.attachments) {
      if (attachment.url) urls.add(attachment.url);
    }
  }
  return [...urls];
}
