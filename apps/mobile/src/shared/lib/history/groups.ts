import { ConversationStatus, LIMITS, hkDayKey, hkStartDaysAgo, type ConversationView } from "@spring/shared";

export type HistoryGroups = {
  pinned: ConversationView[];
  today: ConversationView[];
  yesterday: ConversationView[];
  earlier: ConversationView[];
  archived: ConversationView[];
};

function hkYesterdayKey(now: Date): string {
  const noon = new Date(`${hkDayKey(now)}T12:00:00+08:00`);
  return hkDayKey(new Date(noon.getTime() - 24 * 60 * 60 * 1000));
}

function byLastMessage(left: ConversationView, right: ConversationView): number {
  return right.lastMessageAt.localeCompare(left.lastMessageAt);
}

export function inTrashWindow(item: ConversationView, now = new Date()): boolean {
  if (item.status !== ConversationStatus.DELETED) return false;
  if (!item.updatedAt) return true;
  return new Date(item.updatedAt).getTime() >= hkStartDaysAgo(now, LIMITS.historyTrashDays).getTime();
}

export function lastActiveOf(items: ConversationView[]): ConversationView | undefined {
  return items
    .filter((item) => item.status === ConversationStatus.ACTIVE)
    .slice()
    .sort(byLastMessage)[0];
}

export function groupHistory(items: ConversationView[], now = new Date()): HistoryGroups {
  const live = items.filter((item) => item.status !== ConversationStatus.DELETED);
  const pinned = live
    .filter((item) => item.pinnedAt && item.status !== ConversationStatus.ARCHIVED)
    .slice()
    .sort((left, right) => (right.pinnedAt ?? "").localeCompare(left.pinnedAt ?? ""));
  const archived = live.filter((item) => item.status === ConversationStatus.ARCHIVED).slice().sort(byLastMessage);
  const rest = live
    .filter((item) => !item.pinnedAt && item.status !== ConversationStatus.ARCHIVED)
    .slice()
    .sort(byLastMessage);
  const todayKey = hkDayKey(now);
  const yesterdayKey = hkYesterdayKey(now);
  const today: ConversationView[] = [];
  const yesterday: ConversationView[] = [];
  const earlier: ConversationView[] = [];
  for (const item of rest) {
    const day = hkDayKey(new Date(item.lastMessageAt));
    if (day === todayKey) today.push(item);
    else if (day === yesterdayKey) yesterday.push(item);
    else earlier.push(item);
  }
  return { pinned, today, yesterday, earlier, archived };
}
