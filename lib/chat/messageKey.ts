import type { Message } from "./types";

/** List keys when `id` is missing (e.g. live WS payload with no id field). */
export function stableMessageListKey(m: Message): string {
  if (m.id != null && String(m.id).trim() !== "") return String(m.id).trim();
  return [
    m.chatId,
    m.createdAt,
    m.messageTime ?? "",
    m.text,
    m.senderId,
  ].join("\0");
}

/** Dedupe when either message may omit `id`. */
export function messagesAreSameListItem(a: Message, b: Message): boolean {
  const aid = a.id != null ? String(a.id).trim() : "";
  const bid = b.id != null ? String(b.id).trim() : "";
  if (aid !== "" && bid !== "") return aid === bid;
  return stableMessageListKey(a) === stableMessageListKey(b);
}
