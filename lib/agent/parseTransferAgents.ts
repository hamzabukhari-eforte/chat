/**
 * Parse transfer agent options from SES `getQueueNAssignedChats` (`userList`).
 */

import type { TransferAgentOption } from "@/lib/chat/types";

/** Known JSON keys on getQueueNAssignedChats — anything else is ignored for legacy top-level agent map extraction. */
const QUEUE_RESPONSE_STRUCTURE_KEYS = new Set([
  "queueChats",
  "assignedChats",
  "queueCount",
  "assignedCount",
  "domainIndex",
  "chatFrom",
  "moduleIndex",
  "userId",
  "userList",
  "domainList",
  "awayReasons",
  "emailTemplates",
  "smsTemplates",
]);

function parseNumericIdAgentMap(
  map: unknown,
): { id: string; name: string }[] {
  if (!map || typeof map !== "object" || Array.isArray(map)) return [];
  const o = map as Record<string, unknown>;
  const out: { id: string; name: string }[] = [];
  for (const key of Object.keys(o)) {
    if (!/^\d+$/.test(key)) continue;
    const v = o[key];
    const name =
      typeof v === "string"
        ? v.trim()
        : typeof v === "number" && Number.isFinite(v)
          ? String(v)
          : "";
    if (!name) continue;
    out.push({ id: key, name });
  }
  return out;
}

/** New SES shape: `userList: [{ id, userName, isLoggedIn }, ...]`. */
function parseUserListArray(raw: unknown): TransferAgentOption[] {
  if (!Array.isArray(raw)) return [];
  const out: TransferAgentOption[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    const idRaw = r.id;
    const id =
      typeof idRaw === "number" && Number.isFinite(idRaw)
        ? String(Math.trunc(idRaw))
        : typeof idRaw === "string" && /^\d+$/.test(idRaw.trim())
          ? idRaw.trim()
          : "";
    if (!id) continue;
    const userName = r.userName;
    const name =
      typeof userName === "string"
        ? userName.trim()
        : typeof userName === "number" && Number.isFinite(userName)
          ? String(userName)
          : "";
    if (!name) continue;
    out.push({
      id,
      name,
      isLoggedIn: Boolean(r.isLoggedIn),
    });
  }
  out.sort((a, b) => Number(a.id) - Number(b.id));
  return out;
}

/**
 * SES `userList`: array `{ id, userName, isLoggedIn }[]`, or legacy id → name map, or
 * legacy top-level numeric keys on the queue payload.
 */
export function extractTransferAgentsFromQueueResponse(
  data: unknown,
): TransferAgentOption[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const o = data as Record<string, unknown>;
  const fromArray = parseUserListArray(o.userList);
  if (fromArray.length > 0) return fromArray;

  const fromUserList = parseNumericIdAgentMap(o.userList);
  if (fromUserList.length > 0) {
    fromUserList.sort((a, b) => Number(a.id) - Number(b.id));
    return fromUserList;
  }
  const out: { id: string; name: string }[] = [];
  for (const key of Object.keys(o)) {
    if (QUEUE_RESPONSE_STRUCTURE_KEYS.has(key)) continue;
    if (!/^\d+$/.test(key)) continue;
    const v = o[key];
    const name =
      typeof v === "string"
        ? v.trim()
        : typeof v === "number" && Number.isFinite(v)
          ? String(v)
          : "";
    if (!name) continue;
    out.push({ id: key, name });
  }
  out.sort((a, b) => Number(a.id) - Number(b.id));
  return out;
}

export function extractDomainAndChatFrom(
  data: unknown,
): { domainIndex: number | null; chatFrom: number | null } {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { domainIndex: null, chatFrom: null };
  }
  const o = data as Record<string, unknown>;
  const domainRaw = o.domainIndex ?? o.DomainIndex;
  const domainIndex =
    typeof domainRaw === "number" && Number.isFinite(domainRaw)
      ? Math.trunc(domainRaw)
      : typeof domainRaw === "string" && Number.isFinite(Number(domainRaw))
        ? Math.trunc(Number(domainRaw))
        : null;
  const chatFromRaw = o.chatFrom ?? o.ChatFrom ?? o.moduleIndex ?? o.ModuleIndex;
  const chatFrom =
    typeof chatFromRaw === "number" && Number.isFinite(chatFromRaw)
      ? Math.trunc(chatFromRaw)
      : typeof chatFromRaw === "string" && Number.isFinite(Number(chatFromRaw))
        ? Math.trunc(Number(chatFromRaw))
        : null;
  return { domainIndex, chatFrom };
}
