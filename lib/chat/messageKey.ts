import type { Message } from "./types";

/** List keys when `id` is missing (e.g. live WS payload with no id field). */
export function stableMessageListKey(m: Message): string {
  const idRaw = m.id;
  if (idRaw != null) {
    const id = String(idRaw).trim();
    // SES sometimes sends `0` for multiple rows — treat as non-unique.
    if (id !== "" && id !== "0") return id;
  }
  return [
    m.id != null ? String(m.id) : "",
    m.chatId,
    m.createdAt,
    m.messageTime ?? "",
    m.text,
    m.senderId,
    m.senderRole,
  ].join("\0");
}

/** React list key — stable id plus index so duplicate API ids never collide. */
export function messageListKey(m: Message, index: number): string {
  return `${stableMessageListKey(m)}\x01${index}`;
}

/** Dedupe when either message may omit `id`. */
export function messagesAreSameListItem(a: Message, b: Message): boolean {
  const aid = a.id != null ? String(a.id).trim() : "";
  const bid = b.id != null ? String(b.id).trim() : "";
  if (aid !== "" && bid !== "") return aid === bid;
  return stableMessageListKey(a) === stableMessageListKey(b);
}
