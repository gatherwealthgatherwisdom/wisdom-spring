import { ConversationStatus, hkDayKey, type ConversationView } from "@spring/shared";

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

export function lastActiveOf(items: ConversationView[]): ConversationView | undefined {
  return items
    .filter((item) => item.status === ConversationStatus.ACTIVE)
    .slice()
    .sort(byLastMessage)[0];
}

export function groupHistory(items: ConversationView[], now = new Date()): HistoryGroups {
  const pinned = items
    .filter((item) => item.pinnedAt && item.status !== ConversationStatus.ARCHIVED)
    .slice()
    .sort((left, right) => (right.pinnedAt ?? "").localeCompare(left.pinnedAt ?? ""));
  const archived = items.filter((item) => item.status === ConversationStatus.ARCHIVED).slice().sort(byLastMessage);
  const rest = items
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
