/**
 * Normalize SES delivery / read fields to `3` = delivered, `4` = seen (gray vs blue ticks).
 * Used by WebSocket `CHAT_SEEN` and `loadConversationById` rows (`seenStatus`, etc.).
 */
export function parseSesSeenStatusFromFields(
  src: Record<string, unknown> | null | undefined,
): 3 | 4 | null {
  if (!src) return null;
  const raw =
    src.status ??
    src.Status ??
    src.chatSeenStatus ??
    src.ChatSeenStatus ??
    src.seenStatus ??
    src.SeenStatus ??
    src.chat_seen_status;
  if (raw === undefined || raw === null) return null;
  if (raw === true || raw === "true" || raw === "TRUE") return 4;
  if (raw === false || raw === "false" || raw === "FALSE") return 3;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (s === "seen" || s === "read" || s === "blue") return 4;
    if (s === "delivered" || s === "sent") return 3;
  }
  const n =
    typeof raw === "number" && Number.isFinite(raw)
      ? raw
      : Number(String(raw).trim());
  if (Number.isNaN(n)) return null;
  if (n === 3 || n === 4) return n;
  if (n === 1) return 3;
  if (n === 2) return 4;
  return null;
}
