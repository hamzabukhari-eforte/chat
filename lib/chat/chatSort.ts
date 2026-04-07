import type { Chat } from "./types";

/** Milliseconds for last activity: newest message, else chat row time. */
export function chatLastActivityTimestampMs(chat: Chat): number {
  const s = chat.lastMessage?.createdAt ?? chat.createdAt;
  const t = Date.parse(s);
  return Number.isNaN(t) ? 0 : t;
}

/** Newest / most recently active first (sidebar queue & my chats). */
export function sortChatsByLatestFirst(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => {
    const diff =
      chatLastActivityTimestampMs(b) - chatLastActivityTimestampMs(a);
    if (diff !== 0) return diff;
    return String(b.id).localeCompare(String(a.id));
  });
}
