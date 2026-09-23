"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { messagesAreSameListItem, stableMessageListKey } from "../lib/chat/messageKey";
import {
  createdAtFromMessageHeaderAndTime,
  formatMessageTimeForDisplay,
  formatSesLocalMessageTime,
  formatSidebarChatListTime,
  parseSesDateTimeToDate,
  splitSesMessageHeader,
} from "../lib/chat/sesMessageTime";
import { parseSesSeenStatusFromFields } from "../lib/chat/sesChatSeenStatus";
import {
  attachmentsFromSesFields,
  stripSesPlaceholderCaption,
} from "../lib/chat/sesMedia";
import {
  normalizeLoadConversationApiMessageText,
  normalizeSesWireMessageText,
} from "../lib/chat/sesWireText";
import {
  binaryChunkCountForFileSize,
  FILE_CHUNK_SIZE_BYTES,
} from "../lib/chat/fileChunks";
import { parseTicketListRows } from "../lib/chat/ticketList";
import type {
  Attachment,
  AwayReasonOption,
  Chat,
  CustomerChatTicket,
  Message,
  Role,
  TransferAgentOption,
  User,
} from "../lib/chat/types";
import { ChatWebSocketClient } from "../lib/websocket/client";
import {
  createSocialChannelApiUrls,
  type SocialChannelApiUrls,
} from "@/lib/agent/socialChannelApiUrls";
import {
  WHATSAPP_SOCIAL_CHANNEL_CONFIG,
  type SocialChannelChatConfig,
} from "@/lib/agent/socialChannelConfig";
import { SES_API_FETCH_CREDENTIALS } from "@/lib/agent/sesApiOrigin";
import { playNewMessageNotificationSound } from "@/lib/chat/notificationSound";
import { toast } from "sonner";

/**
 * After JSON file metadata, wait for `{ msg: "R", msgtype: "2" }` before binary chunks.
 * Default off — many SES flows do not ack before binary; enabling avoids hangs when the server
 * never sends `R` after metadata (symptom: only PDFs seemed to work, images/videos never finish).
 * Set `NEXT_PUBLIC_WS_FILE_WAIT_ACK_AFTER_METADATA=1` if your gateway requires the handshake.
 */
const WS_FILE_WAIT_ACK_AFTER_METADATA =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_WS_FILE_WAIT_ACK_AFTER_METADATA === "1";

/**
 * After each binary chunk, wait for the same ack before the next chunk.
 * Set true if the server only signals readiness per chunk (not only once after metadata).
 */
const WS_FILE_WAIT_ACK_AFTER_EACH_CHUNK = false;

function parseLooseBoolean(raw: unknown): boolean | null {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") {
    if (raw === 1) return true;
    if (raw === 0) return false;
  }
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
}

function extractAutoAssignmentEnabled(json: unknown): boolean {
  if (!json || typeof json !== "object" || Array.isArray(json)) return false;
  const root = json as Record<string, unknown>;
  const fromRoot = parseLooseBoolean(root.isAutoAssignmentEnabled);
  if (fromRoot !== null) return fromRoot;

  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const fromData = parseLooseBoolean(
      (data as Record<string, unknown>).isAutoAssignmentEnabled,
    );
    if (fromData !== null) return fromData;
  }

  const result = root.result;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const fromResult = parseLooseBoolean(
      (result as Record<string, unknown>).isAutoAssignmentEnabled,
    );
    if (fromResult !== null) return fromResult;
  }
  return false;
}

async function fetchAutoAssignmentStatus(
  urls: SocialChannelApiUrls,
  userId: string,
): Promise<boolean> {
  const url = new URL(urls.autoAssignmentStatus);
  url.searchParams.set("Userid", userId);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: SES_API_FETCH_CREDENTIALS,
  });
  if (!res.ok) {
    throw new Error(`getAutoAssignmentStatus failed: ${res.status}`);
  }
  const json: unknown = await res.json();
  return extractAutoAssignmentEnabled(json);
}

interface QueueNAssignedRow {
  number?: string;
  messageTime?: string;
  country?: string | null;
  city?: string | null;
  profilePic?: string;
  lastMsg?: string;
  userName?: string;
  region?: string | null;
  chatIndex: string | number;
  email?: string;
  counts?: number;
  isChatActive?: boolean;
  lastAssignedAgent?: string | null;
  lastChatTime?: string;
}

interface QueueNAssignedChatsResponse {
  domainIndex?: number;
  moduleIndex?: number;
  chatFrom?: number;
  userId?: string;
  /**
   * Agents: either legacy id → name map, or an array of
   * `{ id, userName, isLoggedIn }` from SES.
   */
  userList?: unknown;
  /** Domain id (numeric string) → label for ticket / routing UI. */
  domainList?: Record<string, string | number>;
  /** Email template id (numeric string) → template name. */
  emailTemplates?: Record<string, string | number>;
  /** SMS template id (numeric string) → template name. */
  smsTemplates?: Record<string, string | number>;
  /** Break / away reasons for agent presence (header dropdown). */
  awayReasons?: unknown;
  queueChats: QueueNAssignedRow[];
  queueCount: number;
  assignedCount: number;
  assignedChats: QueueNAssignedRow[];
}

/** Known JSON keys on getQueueNAssignedChats — anything else is ignored for legacy top-level agent map extraction. */
const QUEUE_RESPONSE_STRUCTURE_KEYS = new Set([
  "queueChats",
  "assignedChats",
  "queueCount",
  "assignedCount",
  "domainIndex",
  "chatFrom",
  "userId",
  "userList",
  "domainList",
  "awayReasons",
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
 * Sorted by numeric user id, same as `domainList` / template maps.
 */
function extractTransferAgentsFromQueueResponse(
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

/** `getQueueNAssignedChats` → `domainList` (numeric id → domain name). */
function extractTicketDomainsFromQueueResponse(
  data: unknown,
): { id: string; name: string }[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const raw = (data as Record<string, unknown>).domainList;
  const rows = parseNumericIdAgentMap(raw);
  rows.sort((a, b) => Number(a.id) - Number(b.id));
  return rows;
}

function extractTicketEmailTemplatesFromQueueResponse(
  data: unknown,
): { id: string; name: string }[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const raw = (data as Record<string, unknown>).emailTemplates;
  const rows = parseNumericIdAgentMap(raw);
  rows.sort((a, b) => Number(a.id) - Number(b.id));
  return rows;
}

function extractTicketSmsTemplatesFromQueueResponse(
  data: unknown,
): { id: string; name: string }[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const raw = (data as Record<string, unknown>).smsTemplates;
  const rows = parseNumericIdAgentMap(raw);
  rows.sort((a, b) => Number(a.id) - Number(b.id));
  return rows;
}

/** `getQueueNAssignedChats` → `awayReasons`: `[{ reason, id }, ...]`. */
function extractAwayReasonsFromQueueResponse(data: unknown): AwayReasonOption[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) return [];
  const o = data as Record<string, unknown>;
  let raw: unknown = o.awayReasons;
  if (
    !Array.isArray(raw) &&
    o.data &&
    typeof o.data === "object" &&
    !Array.isArray(o.data)
  ) {
    raw = (o.data as Record<string, unknown>).awayReasons;
  }
  if (!Array.isArray(raw)) return [];
  const out: AwayReasonOption[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const o = row as Record<string, unknown>;
    const idRaw = o.id ?? o.Id ?? o.ID;
    const id =
      typeof idRaw === "number" && Number.isFinite(idRaw)
        ? String(Math.trunc(idRaw))
        : typeof idRaw === "string"
          ? idRaw.trim()
          : "";
    const reasonRaw = o.reason ?? o.Reason ?? o.name ?? o.Name;
    const reason =
      typeof reasonRaw === "string"
        ? reasonRaw.trim()
        : typeof reasonRaw === "number" && Number.isFinite(reasonRaw)
          ? String(reasonRaw)
          : "";
    if (!id || !reason) continue;
    out.push({ id, reason });
  }
  return out;
}

interface BackendWsInitializer {
  chatroomId: "0";
  userId: string;
  type: "initializer";
  From: "Agent";
  domainIndex: number;
  chatFrom: number;
}

function parseMessageTime(raw: string | null | undefined): string {
  const parsed = parseSesDateTimeToDate(raw);
  if (parsed) return parsed.toISOString();
  return new Date().toISOString();
}

function mapQueueRowToChat(
  row: QueueNAssignedRow,
  status: "queued" | "assigned",
  agentUser?: User,
): Chat {
  const id = String(row.chatIndex);
  const number = String(row.number ?? "").trim();
  const email = String(row.email ?? "").trim();
  const messageTime = String(row.messageTime ?? "");
  const lastMsg = String(row.lastMsg ?? "").trim();
  const userName = String(row.userName ?? "").trim();
  const profilePic = String(row.profilePic ?? "").trim();

  const customer: User = {
    id: email || number || id,
    name: userName || number || email || "Customer",
    role: "customer",
    avatar: profilePic || undefined,
    email: email || undefined,
    phone: number || undefined,
    city: row.city != null ? String(row.city).trim() || undefined : undefined,
    country:
      row.country != null ? String(row.country).trim() || undefined : undefined,
    region:
      row.region != null ? String(row.region).trim() || undefined : undefined,
  };

  const createdAt = parseMessageTime(messageTime);

  let lastMessage: Message | undefined;
  if (lastMsg) {
    lastMessage = {
      id: `last-${id}`,
      chatId: id,
      senderId: customer.id,
      senderRole: "customer",
      text: lastMsg,
      createdAt,
    };
  }

  const lastAssignedRaw = row.lastAssignedAgent;
  const lastAssignedAgent =
    lastAssignedRaw != null && String(lastAssignedRaw).trim() !== ""
      ? String(lastAssignedRaw).trim()
      : undefined;

  const lastChatTimeRaw = String(row.lastChatTime ?? "").trim();

  const countsRaw = row.counts;
  const countsNum = Number(countsRaw);
  const counts =
    countsRaw !== undefined &&
    countsRaw !== null &&
    String(countsRaw).trim() !== "" &&
    Number.isFinite(countsNum)
      ? Math.max(0, Math.trunc(countsNum))
      : undefined;

  const lastChatTimeDisplay =
    lastChatTimeRaw !== ""
      ? formatSidebarChatListTime(lastChatTimeRaw) || lastChatTimeRaw
      : "";

  return {
    id,
    customer,
    agent: status === "assigned" ? agentUser : undefined,
    status,
    lastMessage,
    createdAt,
    messageTimeDisplay:
      messageTime.trim() !== ""
        ? formatSidebarChatListTime(createdAt)
        : undefined,
    whatsappChatIndex: row.chatIndex,
    isChatActive: parseOptionalIsChatActive(
      (row as unknown as { isChatActive?: unknown }).isChatActive,
    ),
    lastAssignedAgent,
    ...(lastChatTimeDisplay !== "" ? { lastChatTime: lastChatTimeDisplay } : {}),
    ...(counts !== undefined ? { counts } : {}),
  };
}

function nullifyDash(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s || s === "-") return null;
  return s;
}

/** SES `NEW_CHAT_IN_QUEUE` row → same shape as `getQueueNAssignedChats` queue rows. */
function mapNewChatInQueueDataToChat(data: Record<string, unknown>): Chat | null {
  const raw = data.chatId ?? data.chatIndex;
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== "number" && typeof raw !== "string") return null;
  const chatIndex: string | number = raw;
  const lastChatTime = String(data.lastChatTime ?? "").trim();
  const lastMsg =
    String(data.lastMsg ?? "").trim() || lastChatTime;
  const countsRaw = data.counts ?? data.count ?? data.unreadCount ?? data.unread_count;
  const countsNum = Number(countsRaw);
  const counts =
    countsRaw !== undefined &&
    countsRaw !== null &&
    String(countsRaw).trim() !== "" &&
    Number.isFinite(countsNum)
      ? Math.max(0, Math.trunc(countsNum))
      : undefined;
  const row: QueueNAssignedRow = {
    number: String(data.number ?? ""),
    messageTime: String(data.messageTime ?? ""),
    country: nullifyDash(data.country),
    city: nullifyDash(data.city),
    profilePic: String(data.profilePic ?? ""),
    lastMsg,
    userName: String(data.userName ?? ""),
    region: nullifyDash(data.region),
    chatIndex,
    email: String(data.email ?? ""),
    isChatActive: parseOptionalIsChatActive(data.isChatActive),
    lastAssignedAgent: nullifyDash(
      data.lastAssignedAgent ?? data.lastAssignedAgentName,
    ),
    ...(lastChatTime !== "" ? { lastChatTime } : {}),
    ...(counts !== undefined ? { counts } : {}),
  };
  return mapQueueRowToChat(row, "queued");
}

type LoadConversationApiRow = Record<string, unknown>;

function flattenConversationRowFields(
  row: LoadConversationApiRow,
): Record<string, unknown> {
  const fields: Record<string, unknown> = { ...row };
  delete fields.msgDetails;
  const raw = row.msgDetails;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    Object.assign(fields, raw as Record<string, unknown>);
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        Object.assign(fields, parsed as Record<string, unknown>);
      }
    } catch {
      // ignore non-JSON msgDetails
    }
  }
  return fields;
}

function extractConversationMessageRows(json: unknown): LoadConversationApiRow[] {
  const pickRows = (o: Record<string, unknown>): LoadConversationApiRow[] | null => {
    for (const key of [
      "conversation",
      "messages",
      "messageList",
      "chatMessages",
    ]) {
      const v = o[key];
      if (Array.isArray(v) && v.length > 0) {
        return v as LoadConversationApiRow[];
      }
    }
    for (const key of ["conversation", "messages", "messageList", "chatMessages"]) {
      const v = o[key];
      if (Array.isArray(v)) return v as LoadConversationApiRow[];
    }
    return null;
  };

  if (Array.isArray(json)) return json as LoadConversationApiRow[];
  if (!json || typeof json !== "object") return [];

  const root = json as Record<string, unknown>;
  const fromRoot = pickRows(root);
  if (fromRoot) return fromRoot;

  for (const nestedKey of ["data", "result"]) {
    const nested = root[nestedKey];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const fromNested = pickRows(nested as Record<string, unknown>);
      if (fromNested) return fromNested;
    }
    if (Array.isArray(nested)) return nested as LoadConversationApiRow[];
  }

  return [];
}

/**
 * API `loadConversationById` rows only (WebSocket `NEW_MESSAGE` uses `lib/websocket/client.ts`).
 * `isFromAgent === true` → agent (right); else customer (left).
 */
function inferSenderRole(row: LoadConversationApiRow): "agent" | "customer" {
  const merged = flattenConversationRowFields(row);

  const isFromAgent = merged.isFromAgent;
  if (typeof isFromAgent === "boolean") {
    return isFromAgent ? "agent" : "customer";
  }

  const sr = merged.senderRole ?? merged.sender_type ?? merged.role;
  if (typeof sr === "string") {
    const s = sr.toLowerCase();
    if (s === "agent" || s === "user" || s === "me") return "agent";
    if (s === "customer" || s === "client") return "customer";
  }
  if (typeof merged.fromAgent === "boolean")
    return merged.fromAgent ? "agent" : "customer";
  if (typeof merged.fromCustomer === "boolean")
    return merged.fromCustomer ? "customer" : "agent";
  if (typeof merged.isAgent === "boolean")
    return merged.isAgent ? "agent" : "customer";
  return "customer";
}

function pickNonEmptyString(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    const s = String(c).trim();
    if (
      !s ||
      s === "-" ||
      s.toLowerCase() === "undefined" ||
      s.toLowerCase() === "null"
    ) {
      continue;
    }
    return s;
  }
  return undefined;
}

/** Prefer SES agent identity from the row — not the viewing agent. */
function resolveAgentSenderFromRow(
  fields: Record<string, unknown>,
  fallbackAgentUserId: string,
): { senderId: string; senderName?: string } {
  const senderName = pickNonEmptyString(
    fields.AgentName,
    fields.agentName,
    fields.senderName,
    fields.userName,
    fields.chatAssignTo,
    fields.assignedAgent,
    fields.lastAssignedAgent,
    fields.lastAssignedAgentName,
    fields.messageBy,
    fields.fromUser,
    fields.agent,
  );
  const loginFromName = (() => {
    if (!senderName) return undefined;
    const dash = senderName.indexOf("-");
    if (dash <= 0) return undefined;
    const login = senderName.slice(0, dash).trim();
    if (login.includes(".") || /^[a-z0-9._@]+$/i.test(login)) return login;
    return undefined;
  })();
  const senderId = pickNonEmptyString(
    fields.agentId,
    fields.AgentId,
    fields.Agentid,
    fields.userId,
    fields.UserId,
    fields.senderId,
    fields.assignedTo,
    loginFromName,
    fields.chatAssignTo,
    senderName,
  );
  return {
    senderId: senderId ?? fallbackAgentUserId,
    ...(senderName ? { senderName } : {}),
  };
}

function mapApiRowToMessage(
  row: LoadConversationApiRow,
  chatId: string,
  index: number,
  agentUserId: string,
  customerId: string,
): Message {
  const idSource = row.msgIndex ?? row.id ?? row.messageId ?? row.msgId;
  const id =
    idSource !== undefined &&
    idSource !== null &&
    String(idSource).trim() !== ""
      ? String(idSource).trim()
      : undefined;
  const text = String(
    row.text ?? row.message ?? row.msg ?? row.body ?? row.content ?? "",
  );
  const rawTime = String(
    row.createdAt ??
      row.messageTime ??
      row.msgtime ??
      row.msgTime ??
      row.timestamp ??
      row.time ??
      row.date ??
      "",
  );

  const fields = flattenConversationRowFields(row);

  const messageHeader = String(fields.messageHeader ?? "").trim();
  const embeddedClock = messageHeader
    ? splitSesMessageHeader(messageHeader).embeddedTime
    : "";
  const headerTimeRaw = String(
    fields.messageTime ?? fields.msgtime ?? fields.msgTime ?? "",
  ).trim() || embeddedClock;
  const createdAt = messageHeader
    ? createdAtFromMessageHeaderAndTime(messageHeader, headerTimeRaw)
    : rawTime
      ? parseMessageTime(rawTime)
      : headerTimeRaw
        ? parseMessageTime(headerTimeRaw)
        : new Date().toISOString();
  const senderRole = inferSenderRole(row);
  const agentSender =
    senderRole === "agent"
      ? resolveAgentSenderFromRow(fields, agentUserId)
      : null;
  const senderId =
    typeof row.senderId === "string" && row.senderId.trim()
      ? row.senderId.trim()
      : agentSender
        ? agentSender.senderId
        : customerId;
  const senderName =
    agentSender?.senderName ??
    (senderRole === "customer"
      ? pickNonEmptyString(fields.userName, fields.customerName, fields.name)
      : undefined);

  const messageTimeRaw =
    headerTimeRaw ||
    embeddedClock ||
    (row.msgtime ?? row.msgTime ?? row.messageTimeDisplay);
  const messageTime =
    typeof messageTimeRaw === "string" &&
    messageTimeRaw.trim() &&
    !/^\d{4}-\d{2}-\d{2}T/.test(messageTimeRaw.trim())
      ? messageTimeRaw.trim()
      : undefined;

  const attachmentIdPrefix = id
    ? `${id}-att`
    : `${chatId}-row-${index}-media`;

  // loadConversationById contract:
  // messageType 1 => text-only
  // messageType 2 => attachment row
  const rawApiMessageType =
    fields.messageType ??
    fields.msgType ??
    fields.MessageType ??
    fields.msgtype ??
    fields.MsgType;
  const apiMessageType =
    typeof rawApiMessageType === "number"
      ? rawApiMessageType
      : typeof rawApiMessageType === "string"
        ? Number(rawApiMessageType.trim())
        : NaN;

  const attachments =
    Number.isFinite(apiMessageType) && apiMessageType === 2
      ? attachmentsFromSesFields(fields, attachmentIdPrefix, {
          trustApiFilename: true,
        })
      : undefined;
  const displayText = stripSesPlaceholderCaption(
    normalizeLoadConversationApiMessageText(text),
    Boolean(attachments?.length),
  );

  const chatSeenStatus = parseSesSeenStatusFromFields(fields);

  return {
    ...(id ? { id } : {}),
    chatId,
    senderId,
    senderRole,
    ...(senderName ? { senderName } : {}),
    text: displayText,
    createdAt,
    ...(messageTime ? { messageTime } : {}),
    ...(messageHeader ? { messageHeader } : {}),
    ...(attachments?.length ? { attachments } : {}),
    ...(chatSeenStatus !== null ? { chatSeenStatus } : {}),
  };
}

function parseLoadConversationMessages(
  json: unknown,
  chatId: string,
  agentUserId: string,
  customerId: string,
): Message[] {
  const rows = extractConversationMessageRows(json);
  return rows.map((row, i) =>
    mapApiRowToMessage(row, chatId, i, agentUserId, customerId),
  );
}

/** Session flag from loadConversation (e.g. 0 = active, 1 = timed out). */
function extractSessionStatus(json: unknown): number | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const raw = (json as Record<string, unknown>).status;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** When present, `false` means the chat is closed and should not be opened. */
function extractIsChatActive(json: unknown): boolean | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const raw = (json as Record<string, unknown>).isChatActive;
  if (typeof raw === "boolean") return raw;
  if (raw === "true" || raw === 1) return true;
  if (raw === "false" || raw === 0) return false;
  return null;
}

function extractTicketList(json: unknown): CustomerChatTicket[] {
  if (!json || typeof json !== "object" || Array.isArray(json)) return [];
  const root = json as Record<string, unknown>;

  const tryKey = (o: Record<string, unknown>): CustomerChatTicket[] | null => {
    const raw = o.ticketList ?? o.TicketList;
    if (!Array.isArray(raw)) return null;
    return parseTicketListRows(raw);
  };

  const fromRoot = tryKey(root);
  if (fromRoot !== null) return fromRoot;

  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = tryKey(data as Record<string, unknown>);
    if (nested !== null) return nested;
  }

  const result = root.result;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const nested = tryKey(result as Record<string, unknown>);
    if (nested !== null) return nested;
  }

  return [];
}

async function fetchTicketListByChatId(
  urls: SocialChannelApiUrls,
  chatIndex: string | number,
  agentUserId: string,
): Promise<CustomerChatTicket[]> {
  const url = new URL(urls.ticketListByChatId);
  url.searchParams.set("Userid", agentUserId);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: SES_API_FETCH_CREDENTIALS,
    body: JSON.stringify({ chatIndex }),
  });
  if (!res.ok) {
    throw new Error(`getTicketListByChatId failed: ${res.status}`);
  }
  const json: unknown = await res.json();
  if (Array.isArray(json)) {
    return parseTicketListRows(json);
  }
  return extractTicketList(json);
}

/** For queue row / chat mapping: set `Chat.isChatActive` only when the API sends a value. */
function parseOptionalIsChatActive(raw: unknown): boolean | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === "boolean") return raw;
  if (raw === "true" || raw === 1) return true;
  if (raw === "false" || raw === 0) return false;
  return undefined;
}

async function fetchConversationByChatIndex(
  urls: SocialChannelApiUrls,
  chatIndex: string | number,
  chatId: string,
  agentUserId: string,
  customerId: string,
): Promise<{
  sessionStatus: number | null;
  isChatActive: boolean | null;
  messages: Message[];
  ticketList: CustomerChatTicket[];
}> {
  const url = new URL(urls.loadConversation);
  url.searchParams.set("Userid", agentUserId);

  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: SES_API_FETCH_CREDENTIALS,
    body: JSON.stringify({ chatIndex }),
  });
  if (!res.ok) {
    throw new Error(`loadConversation failed: ${res.status}`);
  }
  const json: unknown = await res.json();
  const sessionStatus = extractSessionStatus(json);
  const isChatActive = extractIsChatActive(json);
  const ticketList = extractTicketList(json);
  const messages = parseLoadConversationMessages(
    json,
    chatId,
    agentUserId,
    customerId,
  );
  return { sessionStatus, isChatActive, messages, ticketList };
}

/** SES `chatIndex` for APIs: prefer row index, else `chat.id` (also derived from chatIndex). */
function getChatIndexForApi(chat: Chat): string | number | null {
  if (chat.whatsappChatIndex !== undefined && chat.whatsappChatIndex !== null) {
    return chat.whatsappChatIndex;
  }
  const raw = chat.id.trim();
  if (!raw) return null;
  return raw;
}

function chatIndexToApiInt(chatIndex: string | number): number | null {
  if (typeof chatIndex === "number" && Number.isFinite(chatIndex)) {
    return Math.trunc(chatIndex);
  }
  const n = Number(String(chatIndex).trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Oldest first, newest last (stable when timestamps tie). */
function sortMessagesChronologically(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    const na = Number.isNaN(ta) ? 0 : ta;
    const nb = Number.isNaN(tb) ? 0 : tb;
    if (na !== nb) return na - nb;
    return stableMessageListKey(a).localeCompare(stableMessageListKey(b));
  });
}

/**
 * Logged-in agent from SES `getQueueNAssignedChats` (session cookies → `userId`).
 * Returns `null` when the payload has no session user — no synthetic fallback.
 */
function resolveSessionAgentFromQueueResponse(raw: unknown): User | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = pickNonEmptyString(
    o.userId,
    o.Userid,
    o.UserId,
    o.userid,
    o.agentId,
    o.AgentId,
  );
  if (!id) return null;

  let nameFromList: string | undefined;
  const list = o.userList;
  if (Array.isArray(list)) {
    for (const row of list) {
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const r = row as Record<string, unknown>;
      const rowId = pickNonEmptyString(r.id, r.userId, r.Userid);
      const rowName = pickNonEmptyString(r.userName, r.name, r.agentName);
      if (!rowId || !rowName) continue;
      if (
        rowId === id ||
        rowId.toLowerCase() === id.toLowerCase() ||
        rowName.toLowerCase() === id.toLowerCase()
      ) {
        nameFromList = rowName;
        break;
      }
    }
  } else if (list && typeof list === "object") {
    const map = list as Record<string, unknown>;
    const mapped = map[id] ?? map[String(id)];
    nameFromList = pickNonEmptyString(mapped);
  }

  const name =
    nameFromList ||
    pickNonEmptyString(
      o.userName,
      o.agentName,
      o.AgentName,
      o.loginUser,
      o.loginUserName,
      o.name,
    ) ||
    id;

  return {
    id,
    name,
    role: "agent",
  };
}

async function fetchQueueAndAssignedChats(
  urls: SocialChannelApiUrls,
): Promise<{
  chats: Chat[];
  agent: User | null;
  initializer: BackendWsInitializer | null;
  domainIndex: number | null;
  moduleIndex: number | null;
  chatFrom: number | null;
  transferAgents: TransferAgentOption[];
  ticketDomains: { id: string; name: string }[];
  ticketEmailTemplates: { id: string; name: string }[];
  ticketSmsTemplates: { id: string; name: string }[];
  awayReasons: AwayReasonOption[];
}> {
  const url = new URL(urls.queueChats);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: SES_API_FETCH_CREDENTIALS,
  });
  if (!res.ok) {
    throw new Error(`Queue chats failed: ${res.status}`);
  }
  const raw: unknown = await res.json();
  const data = raw as QueueNAssignedChatsResponse;
  const agent = resolveSessionAgentFromQueueResponse(raw);
  const transferAgents = extractTransferAgentsFromQueueResponse(raw);
  const ticketDomains = extractTicketDomainsFromQueueResponse(raw);
  const ticketEmailTemplates = extractTicketEmailTemplatesFromQueueResponse(raw);
  const ticketSmsTemplates = extractTicketSmsTemplatesFromQueueResponse(raw);
  const awayReasons = extractAwayReasonsFromQueueResponse(raw);
  const queue = (data.queueChats ?? []).map((r) =>
    mapQueueRowToChat(r, "queued"),
  );
  const assigned = (data.assignedChats ?? []).map((r) =>
    mapQueueRowToChat(r, "assigned", agent ?? undefined),
  );
  const initializerUserId = agent?.id ?? "";
  const initializer =
    initializerUserId &&
    data.domainIndex !== undefined &&
    (data.chatFrom !== undefined || data.moduleIndex !== undefined)
      ? {
          chatroomId: "0" as const,
          userId: initializerUserId,
          type: "initializer" as const,
          From: "Agent" as const,
          domainIndex: Number(data.domainIndex),
          chatFrom: Number(
            data.chatFrom !== undefined ? data.chatFrom : data.moduleIndex,
          ),
        }
      : null;

  return {
    chats: [...queue, ...assigned],
    agent,
    initializer,
    domainIndex:
      data.domainIndex !== undefined ? Number(data.domainIndex) : null,
    moduleIndex:
      data.moduleIndex !== undefined
        ? Number(data.moduleIndex)
        : data.chatFrom !== undefined
          ? Number(data.chatFrom)
          : null,
    chatFrom:
      data.chatFrom !== undefined
        ? Number(data.chatFrom)
        : data.moduleIndex !== undefined
          ? Number(data.moduleIndex)
          : null,
    transferAgents,
    ticketDomains,
    ticketEmailTemplates,
    ticketSmsTemplates,
    awayReasons,
  };
}

function parseAssignStatus(json: unknown): number | null {
  if (typeof json === "number") return json;
  if (!json || typeof json !== "object") return null;
  const obj = json as Record<string, unknown>;
  const raw = obj.status ?? obj.assignStatus ?? obj.code ?? obj.result;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** transferChat JSON: `status` 0 = cannot transfer, 1 = success, 2 = already closed. */
function parseTransferChatStatus(json: unknown): number | null {
  if (typeof json === "number") return json;
  if (!json || typeof json !== "object") return null;
  const raw = (json as Record<string, unknown>).status;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function assignChatToAgent(
  urls: SocialChannelApiUrls,
  chatIndex: string | number,
  domainIndex: number,
  chatFrom: number,
  userId: string,
): Promise<number | null> {
  const url = new URL(urls.assignChat);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: SES_API_FETCH_CREDENTIALS,
    body: JSON.stringify({
      chatIndex,
      domainIndex,
      chatFrom,
    }),
  });
  if (!res.ok) {
    throw new Error(`assignChat failed: ${res.status}`);
  }
  const json: unknown = await res.json();
  return parseAssignStatus(json);
}

/**
 * `agentIndex`: `0` when returning to queue; otherwise target agent id from `userList`.
 * `isTransferredToAgent`: `false` for queue, `true` for agent.
 */
async function transferChannelChat(
  urls: SocialChannelApiUrls,
  chatIndex: string | number,
  domainIndex: number,
  chatFrom: number,
  userId: string,
  agentIndex: number,
  isTransferredToAgent: boolean,
): Promise<number | null> {
  const ci = chatIndexToApiInt(chatIndex);
  if (ci === null) return null;
  const url = new URL(urls.transferChat);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: SES_API_FETCH_CREDENTIALS,
    body: JSON.stringify({
      chatIndex: ci,
      domainIndex: Math.trunc(domainIndex),
      chatFrom: Math.trunc(chatFrom),
      agentIndex: Math.trunc(agentIndex),
      isTransferredToAgent,
    }),
  });
  if (!res.ok) {
    throw new Error(`transferChat failed: ${res.status}`);
  }
  const json: unknown = await res.json();
  return parseTransferChatStatus(json);
}

async function closeChannelChat(
  urls: SocialChannelApiUrls,
  chatIndex: string | number,
  domainIndex: number,
  chatFrom: number,
  userId: string,
): Promise<number | null> {
  const url = new URL(urls.closeChat);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: SES_API_FETCH_CREDENTIALS,
    body: JSON.stringify({
      chatIndex,
      domainIndex,
      chatFrom,
    }),
  });
  if (!res.ok) {
    throw new Error(`closeChat failed: ${res.status}`);
  }
  const json: unknown = await res.json();
  return parseAssignStatus(json);
}

interface State {
  chats: Chat[];
  messages: Message[];
  activeChatId: string | null;
  isInitialLoading: boolean;
  showQueue: boolean;
  domainIndex: number | null;
  moduleIndex: number | null;
  chatFrom: number | null;
  /** Agent id → display name from getQueueNAssignedChats `userList` (or legacy top-level numeric keys). */
  transferAgents: TransferAgentOption[];
  /** Domain id → label from `getQueueNAssignedChats` `domainList` (ticket panel). */
  ticketDomains: { id: string; name: string }[];
  /** Email templates from `getQueueNAssignedChats` `emailTemplates`. */
  ticketEmailTemplates: { id: string; name: string }[];
  /** SMS templates from `getQueueNAssignedChats` `smsTemplates`. */
  ticketSmsTemplates: { id: string; name: string }[];
  /** Away / break reasons from `getQueueNAssignedChats` `awayReasons` (header status). */
  awayReasons: AwayReasonOption[];
  /** `CHAT_SEEN` can arrive before `NEW_MESSAGE`; apply when a message with that `id` appears. */
  pendingSeenByMsgId: Record<string, 3 | 4>;
  /** True while `getTicketListByChatId` is in flight for the info sidebar. */
  ticketListLoading: boolean;
}

const initialState: State = {
  chats: [],
  messages: [],
  activeChatId: null,
  isInitialLoading: true,
  showQueue: false,
  domainIndex: null,
  moduleIndex: null,
  chatFrom: null,
  transferAgents: [],
  ticketDomains: [],
  ticketEmailTemplates: [],
  ticketSmsTemplates: [],
  awayReasons: [],
  pendingSeenByMsgId: {},
  ticketListLoading: false,
};

function applyPendingSeenToMessage(
  m: Message,
  pending: Record<string, 3 | 4>,
): { message: Message; pending: Record<string, 3 | 4> } {
  if (m.id == null) return { message: m, pending };
  const key = String(m.id);
  const st = pending[key];
  if (st !== 3 && st !== 4) return { message: m, pending };
  const { [key]: _, ...rest } = pending;
  return { message: { ...m, chatSeenStatus: st }, pending: rest };
}

type AgentChannelContext = {
  domainIndex: number | null;
  chatFrom: number | null;
};

function parseOptionalChannelNumber(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    return undefined;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

/** Ignore WS / queue rows for another SES channel when `chatFrom` / `domainIndex` are set. */
function wsPayloadMatchesAgentChannel(
  ctx: AgentChannelContext,
  fields: { domainIndex?: number; chatFrom?: number },
): boolean {
  if (
    fields.domainIndex !== undefined &&
    ctx.domainIndex !== null &&
    ctx.domainIndex !== fields.domainIndex
  ) {
    return false;
  }
  if (
    fields.chatFrom !== undefined &&
    ctx.chatFrom !== null &&
    ctx.chatFrom !== fields.chatFrom
  ) {
    return false;
  }
  return true;
}

function wsQueueRowMatchesAgentChannel(
  ctx: AgentChannelContext,
  data: Record<string, unknown>,
): boolean {
  return wsPayloadMatchesAgentChannel(ctx, {
    domainIndex: parseOptionalChannelNumber(
      data.domainIndex ?? data.DomainIndex,
    ),
    chatFrom: parseOptionalChannelNumber(
      data.chatFrom ?? data.ChatFrom ?? data.chat_from,
    ),
  });
}

function chatRowExistsInState(chats: Chat[], chatId: string): boolean {
  const idStr = chatId.trim();
  if (!idStr) return false;
  return chats.some(
    (c) =>
      c.id === idStr ||
      (c.whatsappChatIndex !== undefined &&
        String(c.whatsappChatIndex) === idStr),
  );
}

function findChatRowInState(chats: Chat[], chatId: string): Chat | undefined {
  const idStr = chatId.trim();
  if (!idStr) return undefined;
  return chats.find(
    (c) =>
      c.id === idStr ||
      (c.whatsappChatIndex !== undefined &&
        String(c.whatsappChatIndex) === idStr),
  );
}

/** Dedup Strict Mode / duplicate WS deliveries for the same customer message. */
const recentMyChatMessageToastAtMs = new Map<string, number>();
/** Shared across `NEW_MESSAGE` + `NEW_MESSAGE_COUNT` so both don't double-notify. */
const recentMyChatNotifyAtMs = new Map<string, number>();
const MY_CHAT_NOTIFY_DEDUP_MS = 2500;

function messageToastPreview(message: Message): string {
  const text = stripSesPlaceholderCaption(
    normalizeSesWireMessageText(message.text),
    Boolean(message.attachments?.length),
  )
    .replace(/\s+/g, " ")
    .trim();
  if (text) return text.length > 80 ? `${text.slice(0, 79)}…` : text;
  const first = message.attachments?.[0];
  if (!first) return "New message";
  if (first.type === "image") return "Sent an image";
  if (first.type === "video") return "Sent a video";
  if (first.type === "audio") return "Sent an audio message";
  return first.name?.trim() || "Sent an attachment";
}

function isActiveChatForMessage(
  chat: Chat,
  messageChatId: string,
  activeChatId: string | null,
): boolean {
  if (activeChatId == null) return false;
  return (
    activeChatId === chat.id ||
    (chat.whatsappChatIndex !== undefined &&
      String(chat.whatsappChatIndex) === String(activeChatId)) ||
    String(activeChatId) === String(messageChatId)
  );
}

function isAssignedMyChat(chat: Chat, agentId: string | undefined): boolean {
  if (!agentId) return false;
  if (chat.status === "queued") return false;
  return chat.agent?.id === agentId;
}

/** Returns true when this chat has not notified recently (and claims the slot). */
function claimMyChatNotifySlot(chatId: string): boolean {
  const nowMs = Date.now();
  const lastAt = recentMyChatNotifyAtMs.get(chatId) ?? 0;
  if (nowMs - lastAt < MY_CHAT_NOTIFY_DEDUP_MS) return false;
  recentMyChatNotifyAtMs.set(chatId, nowMs);
  return true;
}

function myChatNotifyToastId(chatId: string): string {
  return `my-chat-msg:${chatId}`;
}

/** Notify agent of a new customer message on one of their assigned chats. */
function notifyNewMyChatCustomerMessage(opts: {
  chat: Chat;
  message: Message;
  agentId: string | undefined;
  activeChatId: string | null;
}) {
  const { chat, message, agentId, activeChatId } = opts;
  if (!isAssignedMyChat(chat, agentId)) return;
  if (message.system) return;
  if (message.senderRole !== "customer") return;

  const dedupKey = `${stableMessageListKey(message)}:${message.chatId}`;
  const nowMs = Date.now();
  const lastAt = recentMyChatMessageToastAtMs.get(dedupKey) ?? 0;
  if (nowMs - lastAt < MY_CHAT_NOTIFY_DEDUP_MS) return;
  recentMyChatMessageToastAtMs.set(dedupKey, nowMs);

  const viewingThisChat = isActiveChatForMessage(
    chat,
    message.chatId,
    activeChatId,
  );
  // Open thread: message is already visible — no toast or sound.
  if (viewingThisChat) return;

  const playSound = claimMyChatNotifySlot(chat.id);
  const customerName = chat.customer.name?.trim() || "Customer";
  const preview = messageToastPreview(message);

  queueMicrotask(() => {
    if (playSound) playNewMessageNotificationSound();
    toast.info(`${customerName}: ${preview}`, {
      id: myChatNotifyToastId(chat.id),
    });
  });
}

/**
 * Notify from SES `NEW_MESSAGE_COUNT` when unread rises on an assigned chat
 * that is not open (no message body on this event).
 * `chatAssignedTo === 0` means queue — never toast/sound.
 * `chatAssignedTo === 1` means assigned — allow notify.
 */
function notifyNewMyChatFromMessageCount(opts: {
  chat: Chat;
  agentId: string | undefined;
  activeChatId: string | null;
  chatAssignedTo?: 0 | 1;
}) {
  const { chat, agentId, activeChatId, chatAssignedTo } = opts;
  if (chatAssignedTo === 0) return;
  if (chatAssignedTo !== 1 && !isAssignedMyChat(chat, agentId)) return;

  const viewingThisChat = isActiveChatForMessage(
    chat,
    chat.id,
    activeChatId,
  );
  if (viewingThisChat) return;
  if (!claimMyChatNotifySlot(chat.id)) return;

  const customerName = chat.customer.name?.trim() || "Customer";
  queueMicrotask(() => {
    playNewMessageNotificationSound();
    toast.info(`${customerName}: New message`, {
      id: myChatNotifyToastId(chat.id),
    });
  });
}

function mergeChatsById(prev: Chat[], incoming: Chat[]): Chat[] {
  const map = new Map<string, Chat>();
  prev.forEach((c) => map.set(c.id, c));
  incoming.forEach((c) => {
    const existing = map.get(c.id);
    if (!existing) {
      map.set(c.id, c);
      return;
    }
    const ticketList =
      c.ticketList === undefined && existing.ticketList !== undefined
        ? existing.ticketList
        : c.ticketList;
    const counts =
      c.counts === undefined && existing.counts !== undefined
        ? existing.counts
        : c.counts;
    if (ticketList !== c.ticketList || counts !== c.counts) {
      map.set(c.id, { ...c, ticketList, counts });
    } else {
      map.set(c.id, c);
    }
  });
  return Array.from(map.values());
}

const OPTIMISTIC_MSG_ID_PREFIX = "optimistic-local:";

/**
 * Optimistic sends use `currentUser.id`; SES `NEW_MESSAGE` often sets agent
 * `senderId` from assignee display (e.g. "You"). Treat as same outbound when
 * roles match so we replace the placeholder and keep server `id` for ticks.
 */
function optimisticSenderMatchesIncomingEcho(
  optimistic: Message,
  incoming: Message,
): boolean {
  if (optimistic.senderId === incoming.senderId) return true;
  if (optimistic.senderRole !== incoming.senderRole) return false;
  if (optimistic.senderRole === "agent" && incoming.senderRole === "agent") {
    return true;
  }
  return false;
}

function createOptimisticOutboundMessage(params: {
  chatId: string;
  senderId: string;
  senderRole: Role;
  senderName?: string;
  text: string;
  attachments?: Attachment[];
  messageTime: string;
}): Message {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id: `${OPTIMISTIC_MSG_ID_PREFIX}${suffix}`,
    chatId: params.chatId,
    senderId: params.senderId,
    senderRole: params.senderRole,
    ...(params.senderName?.trim()
      ? { senderName: params.senderName.trim() }
      : {}),
    text: params.text,
    createdAt: new Date().toISOString(),
    messageTime: params.messageTime,
    ...(params.attachments?.length ? { attachments: params.attachments } : {}),
  };
}

/** Mirror common SES / Java JSON property names (camelCase vs snake_case vs PascalCase). */
function withSesBinaryFieldAliases(
  base: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  if (base.userId != null) out.user_id = base.userId;
  if (base.chatroomId != null) {
    out.chat_room_id = base.chatroomId;
    const n = Number(base.chatroomId);
    if (!Number.isNaN(n) && String(n) === String(base.chatroomId).trim()) {
      out.chatroomIdInt = n;
    }
  }
  if (base.fileName != null) {
    out.file_name = base.fileName;
    out.FileName = base.fileName;
  }
  if (base.fileSize != null) {
    out.file_size = base.fileSize;
    out.FileSize = base.fileSize;
  }
  if (base.fileType != null) {
    out.file_type = base.fileType;
    out.FileType = base.fileType;
  }
  if (base.chunkIndex !== undefined) {
    out.chunk_index = base.chunkIndex;
    out.ChunkIndex = base.chunkIndex;
  }
  if (base.totalChunks !== undefined) {
    out.total_chunks = base.totalChunks;
    out.TotalChunks = base.totalChunks;
  }
  if (base.chunkData != null && typeof base.chunkData === "string") {
    out.chunk_data = base.chunkData;
    out.ChunkData = base.chunkData;
  }
  if (base.domainIndex !== undefined && base.domainIndex !== null) {
    out.domain_index = base.domainIndex;
  }
  if (base.chatFrom !== undefined && base.chatFrom !== null) {
    out.chat_from = base.chatFrom;
  }
  if (base.Agentid != null) {
    out.agent_id = base.Agentid;
    out.AgentId = base.Agentid;
  }
  if (base.messagefrom != null) {
    out.message_from = base.messagefrom;
  }
  if (base.messageType !== undefined && base.messageType !== null) {
    out.message_type = base.messageType;
  }
  if (base.messageTime != null && typeof base.messageTime === "string") {
    out.message_time = base.messageTime;
  }
  if (base.msgtime != null && typeof base.msgtime === "string") {
    out.msg_time = base.msgtime;
  }
  return out;
}

async function sendFileChunksViaWebSocket(
  client: ChatWebSocketClient,
  files: File[],
  ctx: {
    userId: string;
    chatroomId: string;
    domainIndex: number | null;
    chatFrom: number | null;
    message: string;
    agentId: string;
    messageFrom: "0" | "1";
    messageTime: string;
  },
): Promise<void> {
  const sleep = (ms: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, ms));
  const ackTimeoutMs = 120_000;

  for (const file of files) {
    const totalChunks = binaryChunkCountForFileSize(file.size);
    if (typeof console !== "undefined") {
      console.log("[ws-file] start file transfer (metadata JSON + binary chunks)", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks,
        chunkSizeBytes: FILE_CHUNK_SIZE_BYTES,
        chatroomId: ctx.chatroomId,
        userId: ctx.userId,
        domainIndex: ctx.domainIndex,
        chatFrom: ctx.chatFrom,
        agentId: ctx.agentId,
        waitAckAfterMetadata: WS_FILE_WAIT_ACK_AFTER_METADATA,
        waitAckAfterEachChunk: WS_FILE_WAIT_ACK_AFTER_EACH_CHUNK,
      });
    }

    const fileMetaPayload = withSesBinaryFieldAliases({
      type: "File",
      event: "File",
      messageType: 2,
      userId: ctx.userId,
      chatroomId: ctx.chatroomId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      ...(ctx.domainIndex !== null ? { domainIndex: ctx.domainIndex } : {}),
      ...(ctx.chatFrom !== null ? { chatFrom: ctx.chatFrom } : {}),
    });

    client.sendRaw(fileMetaPayload);

    if (WS_FILE_WAIT_ACK_AFTER_METADATA) {
      await client.waitForSesBinaryFileAck(ackTimeoutMs);
    }

    let chunkIndex = 0;
    for (
      let offset = 0;
      offset < file.size;
      offset += FILE_CHUNK_SIZE_BYTES
    ) {
      const end = Math.min(offset + FILE_CHUNK_SIZE_BYTES, file.size);
      const slice = file.slice(offset, end);
      const buf = await slice.arrayBuffer();
      const chunkByteLength = end - offset;

      if (typeof console !== "undefined") {
        console.log("[ws-file] outbound binary chunk", {
          fileName: file.name,
          chunkIndex,
          totalChunks,
          byteOffset: offset,
          byteLength: chunkByteLength,
        });
      }

      if (!client.sendBinary(buf)) {
        throw new Error("WebSocket is not open; could not send file chunk");
      }

      if (WS_FILE_WAIT_ACK_AFTER_EACH_CHUNK) {
        await client.waitForSesBinaryFileAck(ackTimeoutMs);
      }

      chunkIndex += 1;
    }

    await sleep(300);

    const endOfFilePayload: Record<string, unknown> = {
      chatroomId: ctx.chatroomId,
      userId: ctx.userId,
      type: "EndOfFile",
      event: "EndOfFile",
      fileName: file.name,
      fileSize: file.size,
      filesize: file.size,
      size: file.size,
      fileType: file.type,
      totalChunks,
      totalChunk: totalChunks,
      chunks: totalChunks,
      Agentid: ctx.agentId,
      messagefrom: ctx.messageFrom,
      message: ctx.message,
      messageType: 2,
      messageTime: ctx.messageTime,
      msgtime: ctx.messageTime,
      ...(ctx.domainIndex !== null ? { domainIndex: ctx.domainIndex } : {}),
      ...(ctx.chatFrom !== null ? { chatFrom: ctx.chatFrom } : {}),
    };
    const eofAliased = withSesBinaryFieldAliases(endOfFilePayload);
    if (typeof console !== "undefined") {
      console.log("[ws-file] sending EndOfFile (payload before wire)", {
        fileName: file.name,
        fileSize: file.size,
        totalChunks,
        keys: Object.keys(eofAliased).sort(),
      });
    }
    client.sendRaw(eofAliased);
  }
}

export function useWebSocketChat(
  /** Customer bootstrap only. Agents resolve from SES session — never invent a fallback. */
  initialUser: User | null = null,
  channelConfig: SocialChannelChatConfig = WHATSAPP_SOCIAL_CHANNEL_CONFIG,
) {
  const [state, setState] = useState<State>(initialState);
  /**
   * Customers: seeded from `initialUser`.
   * Agents: SES queue `userId` only — stays null when the session user is missing.
   */
  const [sessionAgent, setSessionAgent] = useState<User | null>(() =>
    initialUser?.role === "customer" ? initialUser : null,
  );
  const currentUser = sessionAgent;
  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionAgentRef = useRef(sessionAgent);
  sessionAgentRef.current = sessionAgent;
  const initialUserRef = useRef(initialUser);
  initialUserRef.current = initialUser;
  const transferToastDedupRef = useRef<Record<string, number>>({});
  /** Avoid overlapping `getTicketListByChatId` calls (e.g. Strict Mode or rapid toggles). */
  const ticketListFetchInFlightRef = useRef(false);
  /** Bumped on channel change so stale cross-channel queue fetches are ignored. */
  const queueFetchGenerationRef = useRef(0);

  const apiUrls = useMemo(
    () => createSocialChannelApiUrls(channelConfig),
    [channelConfig],
  );

  const client = useMemo(
    () => new ChatWebSocketClient(apiUrls.webSocket),
    [apiUrls.webSocket],
  );

  useEffect(() => {
    setState(initialState);
    const seed = initialUserRef.current;
    setSessionAgent(seed?.role === "customer" ? seed : null);
    ticketListFetchInFlightRef.current = false;
    queueFetchGenerationRef.current += 1;
  }, [channelConfig.key]);

  const refreshAgentChatsFromApi = useCallback(
    (opts?: {
      notifyAssignedChatId?: string;
      notifyAssignedUserName?: string;
      source?: "chat-transfer";
    }) => {
      const fetchGeneration = queueFetchGenerationRef.current;
      void (async () => {
        let queueOutcome: Awaited<
          ReturnType<typeof fetchQueueAndAssignedChats>
        > | null = null;
        try {
          queueOutcome = await fetchQueueAndAssignedChats(apiUrls);
        } catch (e) {
          console.error("[queue] getQueueNAssignedChats failed", e);
        }
        if (fetchGeneration !== queueFetchGenerationRef.current) return;

        const seededCustomer =
          initialUserRef.current?.role === "customer"
            ? initialUserRef.current
            : null;

        if (queueOutcome && !seededCustomer) {
          const nextAgent = queueOutcome.agent;
          setSessionAgent((prev) => {
            if (!nextAgent) return null;
            if (
              prev &&
              prev.id === nextAgent.id &&
              prev.name === nextAgent.name
            ) {
              return prev;
            }
            return nextAgent;
          });
        }

        const resolvedAgent =
          seededCustomer ??
          queueOutcome?.agent ??
          sessionAgentRef.current;
        const agentId = resolvedAgent?.id;
        let autoStatusKnown = false;
        let isAutoAssignmentEnabled = false;
        if (agentId) {
          try {
            isAutoAssignmentEnabled = await fetchAutoAssignmentStatus(
              apiUrls,
              agentId,
            );
            autoStatusKnown = true;
          } catch (e) {
            console.error("[queue] getAutoAssignmentStatus failed", e);
          }
        }
        if (fetchGeneration !== queueFetchGenerationRef.current) return;

        const showQueue = autoStatusKnown ? !isAutoAssignmentEnabled : true;

        if (queueOutcome) {
          const result = queueOutcome;
          client.setInitializer(result.initializer);
          setState((prev) => {
            const nextChats = result.chats;
            const notifyAssignedChatId = opts?.notifyAssignedChatId;
            if (notifyAssignedChatId && opts?.source === "chat-transfer") {
              const wasMyChat = prev.chats.some(
                (c) =>
                  c.id === notifyAssignedChatId &&
                  c.status !== "queued" &&
                  c.agent?.id === agentId,
              );
              const isNowMyChat = nextChats.some(
                (c) =>
                  c.id === notifyAssignedChatId &&
                  c.status !== "queued" &&
                  c.agent?.id === agentId,
              );
              if (!wasMyChat && isNowMyChat) {
                const lastToastAtMs =
                  transferToastDedupRef.current[notifyAssignedChatId] ?? 0;
                const nowMs = Date.now();
                if (nowMs - lastToastAtMs < 4000) {
                  return {
                    ...prev,
                    chats: nextChats,
                    showQueue,
                    domainIndex: result.domainIndex ?? prev.domainIndex,
                    moduleIndex: result.moduleIndex ?? prev.moduleIndex,
                    chatFrom: result.chatFrom ?? prev.chatFrom,
                    transferAgents: result.transferAgents,
                    ticketDomains: result.ticketDomains,
                    ticketEmailTemplates: result.ticketEmailTemplates,
                    ticketSmsTemplates: result.ticketSmsTemplates,
                    awayReasons: result.awayReasons,
                  };
                }
                transferToastDedupRef.current[notifyAssignedChatId] = nowMs;
                const assignedUserNameRaw =
                  opts.notifyAssignedUserName?.trim();
                const assignedUserName =
                  assignedUserNameRaw &&
                  assignedUserNameRaw.toLowerCase() !== "undefined" &&
                  assignedUserNameRaw.toLowerCase() !== "null"
                    ? assignedUserNameRaw
                    : undefined;
                toast.success(
                  assignedUserName
                    ? `${assignedUserName}'s chat has been transferred to you.`
                    : "A chat has been transferred to you.",
                );
              }
            }
            return {
              ...prev,
              chats: nextChats,
              showQueue,
              domainIndex: result.domainIndex ?? prev.domainIndex,
              moduleIndex: result.moduleIndex ?? prev.moduleIndex,
              chatFrom: result.chatFrom ?? prev.chatFrom,
              transferAgents: result.transferAgents,
              ticketDomains: result.ticketDomains,
              ticketEmailTemplates: result.ticketEmailTemplates,
              ticketSmsTemplates: result.ticketSmsTemplates,
              awayReasons: result.awayReasons,
            };
          });
        } else if (autoStatusKnown) {
          setState((prev) =>
            prev.showQueue === showQueue ? prev : { ...prev, showQueue },
          );
        }
      })().finally(() => {
        if (fetchGeneration !== queueFetchGenerationRef.current) return;
        setState((prev) =>
          prev.isInitialLoading ? { ...prev, isInitialLoading: false } : prev,
        );
      });
    },
    [apiUrls, client],
  );

  useEffect(() => {
    refreshAgentChatsFromApi();
  }, [refreshAgentChatsFromApi, channelConfig.key]);

  useEffect(() => {
    const userId = currentUser?.id;
    client.connect();
    const unsubscribe = client.subscribe((event) => {
      if (event.type === "chat-transfer") {
        const ctx = stateRef.current;
        if (
          wsPayloadMatchesAgentChannel(ctx, {
            domainIndex: event.payload.domainIndex,
            chatFrom: event.payload.chatFrom,
          })
        ) {
          refreshAgentChatsFromApi({
            notifyAssignedChatId: event.payload.chatId,
            notifyAssignedUserName: event.payload.userName,
            source: "chat-transfer",
          });
        }
      }
      setState((prev) => {
        const channelCtx: AgentChannelContext = {
          domainIndex: prev.domainIndex,
          chatFrom: prev.chatFrom,
        };

        switch (event.type) {
          case "chat-queued": {
            const isOwnChat =
              userId && event.payload.chat.customer.id === userId;
            const chat: Chat = {
              ...event.payload.chat,
              lastMessage: event.payload.firstMessage,
            };
            const hasChat = prev.chats.some((c) => c.id === chat.id);
            const hasMsg = prev.messages.some((m) =>
              messagesAreSameListItem(m, event.payload.firstMessage),
            );
            if (hasMsg) {
              return {
                ...prev,
                chats: hasChat
                  ? prev.chats.map((c) => (c.id === chat.id ? chat : c))
                  : [...prev.chats, chat],
                activeChatId: isOwnChat
                  ? event.payload.chat.id
                  : prev.activeChatId,
              };
            }
            const firstApplied = applyPendingSeenToMessage(
              event.payload.firstMessage,
              prev.pendingSeenByMsgId,
            );
            return {
              ...prev,
              chats: hasChat
                ? prev.chats.map((c) => (c.id === chat.id ? chat : c))
                : [...prev.chats, chat],
              messages: [...prev.messages, firstApplied.message],
              pendingSeenByMsgId: firstApplied.pending,
              activeChatId: isOwnChat
                ? event.payload.chat.id
                : prev.activeChatId,
            };
          }
          case "chat-assigned": {
            return {
              ...prev,
              chats: prev.chats.map((c) =>
                c.id === event.payload.chat.id
                  ? {
                      ...event.payload.chat,
                      lastMessage:
                        event.payload.chat.lastMessage ?? c.lastMessage,
                    }
                  : c,
              ),
            };
          }
          case "message": {
            const incoming = event.payload.message;
            if (!chatRowExistsInState(prev.chats, incoming.chatId)) {
              return prev;
            }
            /**
             * Match optimistic rows to server echo even when the server omits
             * `attachments` (common after chunked upload): normalize captions with
             * `hasAttachments: true` so "." / placeholders align.
             */
            const captionKey = (msg: Message) =>
              stripSesPlaceholderCaption(
                normalizeSesWireMessageText(msg.text),
                true,
              ).trim();

            const incomingCaption = captionKey(incoming);

            const optimisticMatches = prev.messages.filter((m) => {
              if (!String(m.id ?? "").startsWith(OPTIMISTIC_MSG_ID_PREFIX))
                return false;
              if (m.chatId !== incoming.chatId) return false;
              if (m.senderRole !== incoming.senderRole) return false;
              if (!optimisticSenderMatchesIncomingEcho(m, incoming))
                return false;
              return captionKey(m) === incomingCaption;
            });

            const withoutMatchingOptimistic = prev.messages.filter((m) => {
              if (!String(m.id ?? "").startsWith(OPTIMISTIC_MSG_ID_PREFIX))
                return true;
              if (m.chatId !== incoming.chatId) return true;
              if (m.senderRole !== incoming.senderRole) return true;
              if (!optimisticSenderMatchesIncomingEcho(m, incoming))
                return true;
              return captionKey(m) !== incomingCaption;
            });

            const donorOptimistic = optimisticMatches.find(
              (o) => (o.attachments?.length ?? 0) > 0,
            );
            const serverMissingAttachments =
              !incoming.attachments?.length ||
              incoming.attachments.length === 0;
            const mergedIncoming: Message =
              donorOptimistic?.attachments?.length && serverMissingAttachments
                ? {
                    ...incoming,
                    attachments: donorOptimistic.attachments,
                    text:
                      stripSesPlaceholderCaption(incoming.text, true).trim() ||
                      "",
                  }
                : incoming;

            /** SES often echoes a wall-clock string that does not match send time; keep client send instant. */
            const opt = optimisticMatches[0];
            const optHasCaption = opt != null && opt.text.trim() !== "";
            const echoWithClientTime: Message =
              opt != null
                ? {
                    ...mergedIncoming,
                    createdAt: opt.createdAt,
                    messageTime:
                      opt.messageTime ?? mergedIncoming.messageTime,
                    text: optHasCaption ? opt.text : mergedIncoming.text,
                  }
                : mergedIncoming;

            if (
              withoutMatchingOptimistic.some((m) =>
                messagesAreSameListItem(m, echoWithClientTime),
              )
            ) {
              return {
                ...prev,
                messages: withoutMatchingOptimistic.map((m) => {
                  if (!messagesAreSameListItem(m, echoWithClientTime)) return m;
                  const incomingLegacyAttachment =
                    echoWithClientTime.attachments?.some((a) =>
                      /\/recattachments\//i.test(a.url ?? ""),
                    ) ?? false;
                  const existingMediaAttachment =
                    m.attachments?.some((a) =>
                      /\/media\//i.test(a.url ?? ""),
                    ) ?? false;
                  return {
                    ...m,
                    chatSeenStatus:
                      echoWithClientTime.chatSeenStatus ?? m.chatSeenStatus,
                    attachments:
                      incomingLegacyAttachment && existingMediaAttachment
                        ? m.attachments
                        : echoWithClientTime.attachments?.length
                          ? echoWithClientTime.attachments
                          : m.attachments,
                  };
                }),
              };
            }
            const applied = applyPendingSeenToMessage(
              echoWithClientTime,
              prev.pendingSeenByMsgId,
            );
            const chatForToast = findChatRowInState(
              prev.chats,
              applied.message.chatId,
            );
            if (chatForToast) {
              notifyNewMyChatCustomerMessage({
                chat: chatForToast,
                message: applied.message,
                agentId: userId,
                activeChatId: prev.activeChatId,
              });
            }
            return {
              ...prev,
              messages: [...withoutMatchingOptimistic, applied.message],
              pendingSeenByMsgId: applied.pending,
              chats: prev.chats.map((c) => {
                const matchesRow =
                  c.id === applied.message.chatId ||
                  (c.whatsappChatIndex !== undefined &&
                    String(c.whatsappChatIndex) ===
                      String(applied.message.chatId));
                if (!matchesRow) return c;

                const isOpen =
                  prev.activeChatId != null &&
                  (prev.activeChatId === c.id ||
                    String(prev.activeChatId) ===
                      String(applied.message.chatId) ||
                    (c.whatsappChatIndex !== undefined &&
                      String(c.whatsappChatIndex) ===
                        String(prev.activeChatId)));

                const bumpUnread =
                  applied.message.senderRole === "customer" &&
                  !applied.message.system &&
                  !isOpen &&
                  (c.status === "queued" ||
                    (Boolean(userId) && c.agent?.id === userId));

                return {
                  ...c,
                  lastMessage: applied.message,
                  ...(bumpUnread
                    ? { counts: Math.max(0, (c.counts ?? 0) + 1) }
                    : {}),
                };
              }),
            };
          }
          case "chat-updated": {
            return {
              ...prev,
              chats: prev.chats.map((c) =>
                c.id === event.payload.chat.id
                  ? {
                      ...event.payload.chat,
                      lastMessage:
                        event.payload.chat.lastMessage ?? c.lastMessage,
                    }
                  : c,
              ),
            };
          }
          case "remove-from-queue": {
            const chatId = event.payload.chatId;
            const matchesRemoved = (c: Chat) =>
              c.status === "queued" &&
              (String(c.id) === chatId ||
                (c.whatsappChatIndex !== undefined &&
                  String(c.whatsappChatIndex) === chatId));
            if (!prev.chats.some(matchesRemoved)) return prev;

            const removedIds = new Set(
              prev.chats.filter(matchesRemoved).map((c) => c.id),
            );
            const clearingActive =
              prev.activeChatId != null &&
              removedIds.has(prev.activeChatId);

            return {
              ...prev,
              chats: prev.chats.filter((c) => !matchesRemoved(c)),
              activeChatId: clearingActive ? null : prev.activeChatId,
              messages: prev.messages.filter((m) => !removedIds.has(m.chatId)),
            };
          }
          case "new-chat-in-queue": {
            if (!wsQueueRowMatchesAgentChannel(channelCtx, event.payload.data)) {
              return prev;
            }
            const incoming = mapNewChatInQueueDataToChat(event.payload.data);
            if (!incoming) return prev;
            const existing = prev.chats.find(
              (c) =>
                c.id === incoming.id ||
                (c.whatsappChatIndex !== undefined &&
                  incoming.whatsappChatIndex !== undefined &&
                  String(c.whatsappChatIndex) ===
                    String(incoming.whatsappChatIndex)),
            );
            const chat: Chat = {
              ...incoming,
              lastMessage: incoming.lastMessage ?? existing?.lastMessage,
              // Prefer socket count when present; otherwise keep existing badge.
              counts:
                incoming.counts !== undefined
                  ? incoming.counts
                  : existing?.counts,
            };
            return {
              ...prev,
              chats: mergeChatsById(prev.chats, [chat]),
            };
          }
          case "chat-seen": {
            const { msgId, status } = event.payload;
            const n = Number(status);
            if (n !== 3 && n !== 4) return prev;
            const st = (n === 4 ? 4 : 3) as 3 | 4;
            const key = String(msgId).trim();

            const applySeenToMessage = (m: Message): Message => {
              if (m.id == null) return m;
              if (String(m.id).trim() !== key) return m;
              return { ...m, chatSeenStatus: st };
            };

            const matched = prev.messages.some(
              (m) => m.id != null && String(m.id).trim() === key,
            );

            const messages = prev.messages.map(applySeenToMessage);

            const chats = prev.chats.map((c) => {
              const lm = c.lastMessage;
              if (!lm?.id) return c;
              if (String(lm.id).trim() !== key) return c;
              return {
                ...c,
                lastMessage: { ...lm, chatSeenStatus: st },
              };
            });

            if (matched) {
              const { [key]: _, ...rest } = prev.pendingSeenByMsgId;
              return {
                ...prev,
                messages,
                chats,
                pendingSeenByMsgId: rest,
              };
            }
            return {
              ...prev,
              messages,
              chats,
              pendingSeenByMsgId: { ...prev.pendingSeenByMsgId, [key]: st },
            };
          }
          case "chat-transfer": {
            return prev;
          }
          case "new-message-count": {
            const {
              chatId,
              domainIndex,
              chatFrom,
              counts: absoluteCounts,
              chatAssignedTo,
            } = event.payload;
            const idStr = String(chatId).trim();
            if (!idStr) return prev;

            if (
              !wsPayloadMatchesAgentChannel(channelCtx, {
                domainIndex,
                chatFrom,
              })
            ) {
              return prev;
            }

            const matchesRow = (c: Chat) =>
              c.id === idStr ||
              (c.whatsappChatIndex !== undefined &&
                String(c.whatsappChatIndex) === idStr);

            const matchedChat = prev.chats.find(matchesRow);
            if (!matchedChat) return prev;

            // Skip only when this exact chat is open in the conversation pane.
            const isOpen =
              prev.activeChatId != null &&
              (prev.activeChatId === matchedChat.id ||
                String(prev.activeChatId) === idStr ||
                (matchedChat.whatsappChatIndex !== undefined &&
                  String(matchedChat.whatsappChatIndex) ===
                    String(prev.activeChatId)));
            if (isOpen) return prev;

            const prevCounts = matchedChat.counts ?? 0;
            const nextCounts =
              absoluteCounts !== undefined && Number.isFinite(absoluteCounts)
                ? Math.max(0, Math.trunc(absoluteCounts))
                : Math.max(0, prevCounts + 1);

            if (nextCounts > prevCounts) {
              notifyNewMyChatFromMessageCount({
                chat: matchedChat,
                agentId: userId,
                activeChatId: prev.activeChatId,
                chatAssignedTo,
              });
            }

            return {
              ...prev,
              chats: prev.chats.map((c) => {
                if (!matchesRow(c)) return c;
                return { ...c, counts: nextCounts };
              }),
            };
          }
          default:
            return prev;
        }
      });
    });
    return () => {
      unsubscribe();
    };
  }, [client, currentUser, refreshAgentChatsFromApi]);

  const agentLiveChatContextRef = useRef<{
    activeChatId: string | null;
    domainIndex: number | null;
    chatFrom: number | null;
    userId: string | undefined;
  }>({
    activeChatId: null,
    domainIndex: null,
    chatFrom: null,
    userId: undefined,
  });

  useEffect(() => {
    agentLiveChatContextRef.current = {
      activeChatId: state.activeChatId,
      domainIndex: state.domainIndex,
      chatFrom: state.chatFrom,
      userId: currentUser?.id,
    };
  }, [
    state.activeChatId,
    state.domainIndex,
    state.chatFrom,
    currentUser?.id,
  ]);

  useEffect(() => {
    if (currentUser?.role !== "agent") return;
    return client.subscribeOpen(({ isReconnect }) => {
      if (!isReconnect) return;
      const ctx = agentLiveChatContextRef.current;
      if (!ctx.activeChatId || !ctx.userId) return;
      if (ctx.domainIndex === null || ctx.chatFrom === null) return;
      client.sendRaw({
        chatroomId: ctx.activeChatId.toString(),
        userId: ctx.userId.toString(),
        domainIndex: ctx.domainIndex,
        chatFrom: ctx.chatFrom,
        type: "AgentLiveChatStart",
      });
      console.log("[ws] AgentLiveChatStart re-sent after reconnect", {
        chatroomId: ctx.activeChatId,
      });
    });
  }, [client, currentUser?.role]);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "agent") return;
    client.send({ type: "login", payload: { user: currentUser } });
  }, [client, currentUser]);

  const queue = useMemo(
    () => state.chats.filter((c) => c.status === "queued"),
    [state.chats],
  );
  const myChats = useMemo(
    () =>
      state.chats.filter(
        (c) => c.status !== "queued" && c.agent?.id === currentUser?.id,
      ),
    [state.chats, currentUser?.id],
  );
  const activeChat = useMemo(
    () => state.chats.find((c) => c.id === state.activeChatId) ?? null,
    [state.chats, state.activeChatId],
  );
  const activeMessages = useMemo(() => {
    if (!state.activeChatId) return [];
    const forChat = state.messages.filter(
      (m) => m.chatId === state.activeChatId,
    );
    return sortMessagesChronologically(forChat);
  }, [state.messages, state.activeChatId]);

  const startChat = async (
    text: string,
    attachments?: Attachment[],
    files?: File[],
  ) => {
    if (!currentUser) return;
    const messageTime = formatSesLocalMessageTime(new Date());
    if (
      state.activeChatId &&
      (Boolean(text.trim()) || attachments?.length || files?.length)
    ) {
      const optimistic = createOptimisticOutboundMessage({
        chatId: state.activeChatId,
        senderId: currentUser.id,
        senderRole: currentUser.role,
        text: text.trim(),
        attachments,
        messageTime,
      });
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, optimistic],
        chats: prev.chats.map((c) =>
          c.id === state.activeChatId
            ? { ...c, lastMessage: optimistic }
            : c,
        ),
      }));
    }
    client.send({
      type: "customer-start-chat",
      payload: {
        customer: currentUser,
        text,
        attachments,
        messageTime,
        msgtime: messageTime,
      },
    });
    if (files?.length) {
      const activeChat = state.activeChatId
        ? state.chats.find((c) => c.id === state.activeChatId)
        : undefined;
      const agentIdForEndOfFile =
        currentUser.role === "agent"
          ? currentUser.id.toString()
          : activeChat?.agent?.id?.toString() ?? "";
      const messageFrom: "0" | "1" =
        currentUser.role === "agent" ? "1" : "0";
      try {
        await sendFileChunksViaWebSocket(client, files, {
          userId: currentUser.id.toString(),
          chatroomId: "0",
          domainIndex: state.domainIndex,
          chatFrom: state.chatFrom,
          message: text,
          agentId: agentIdForEndOfFile,
          messageFrom,
          messageTime,
        });
      } catch (e) {
        console.error("[ws-file] upload failed", e);
        toast.error(
          e instanceof Error ? e.message : "File upload failed. Try again.",
        );
      }
    }
  };

  const claimChat = async (chatId: string) => {
    if (!currentUser) return;
    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat || chat.status !== "queued") return;
    if (chat.whatsappChatIndex === undefined || chat.whatsappChatIndex === null) {
      toast.error("Unable to assign this chat right now.");
      return;
    }
    if (state.domainIndex === null || state.chatFrom === null) {
      toast.error("Unable to assign this chat right now.");
      return;
    }

    try {
      const status = await assignChatToAgent(
        apiUrls,
        chat.whatsappChatIndex,
        state.domainIndex,
        state.chatFrom,
        currentUser.id,
      );
      if (status === 2) {
        toast.error("This chat is already assigned to another agent.");
        return;
      }
      if (status !== 1) {
        toast.error("Unable to assign this chat right now.");
        return;
      }

      setState((prev) => ({
        ...prev,
        chats: prev.chats.map((c) =>
          c.id === chatId ? { ...c, status: "assigned", agent: currentUser } : c,
        ),
      }));

      client.sendRaw({
        chatroomId: chatId.toString(),
        userId: currentUser.id.toString(),
        domainIndex: state.domainIndex,
        chatFrom: state.chatFrom,
        type: "ChatRequestAccepted",
      });
    } catch {
      toast.error("Unable to assign this chat right now.");
    }
  };

  const sendMessage = async (
    text: string,
    attachments?: Attachment[],
    files?: File[],
  ) => {
    if (!currentUser || !state.activeChatId) return;

    if (currentUser.role === "agent") {
      const hasFiles = Boolean(files?.length);

      if (!hasFiles) {
        const hasAttachment = Boolean(attachments?.length);
        const lines = [
          text.trim(),
          ...(hasAttachment
            ? (attachments ?? []).map((a) => a.url).filter(Boolean)
            : []),
        ].filter(Boolean);
        const messageBody = lines.join("\n");
        if (!messageBody) return;

        const messageTime = formatSesLocalMessageTime(new Date());
        const optimistic = createOptimisticOutboundMessage({
          chatId: state.activeChatId,
          senderId: currentUser.id,
          senderRole: "agent",
          senderName: currentUser.name,
          text: text.trim(),
          attachments: hasAttachment ? attachments : undefined,
          messageTime,
        });
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, optimistic],
          chats: prev.chats.map((c) =>
            c.id === state.activeChatId
              ? { ...c, lastMessage: optimistic }
              : c,
          ),
        }));

        client.sendRaw({
          chatroomId: state.activeChatId.toString(),
          userId: currentUser.id.toString(),
          message: messageBody,
          type: "Message",
          messagefrom: "1",
          messageType: hasAttachment ? "2" : "1",
          Agentid: currentUser.id.toString(),
          messageTime,
          msgtime: messageTime,
          ...(state.domainIndex !== null
            ? { domainIndex: state.domainIndex }
            : {}),
          ...(state.chatFrom !== null ? { chatFrom: state.chatFrom } : {}),
        });
        return;
      }

      const fileList = files;
      if (!fileList?.length) return;

      const t = text.trim();
      const messageTime = formatSesLocalMessageTime(new Date());
      const optimistic = createOptimisticOutboundMessage({
        chatId: state.activeChatId,
        senderId: currentUser.id,
        senderRole: "agent",
        senderName: currentUser.name,
        text: t,
        attachments,
        messageTime,
      });
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, optimistic],
        chats: prev.chats.map((c) =>
          c.id === state.activeChatId
            ? { ...c, lastMessage: optimistic }
            : c,
        ),
      }));

      try {
        await sendFileChunksViaWebSocket(client, fileList, {
          userId: currentUser.id.toString(),
          chatroomId: state.activeChatId,
          domainIndex: state.domainIndex,
          chatFrom: state.chatFrom,
          message: t,
          agentId: currentUser.id.toString(),
          messageFrom: "1",
          messageTime,
        });
      } catch (e) {
        console.error("[ws-file] upload failed", e);
        toast.error(
          e instanceof Error ? e.message : "File upload failed. Try again.",
        );
      }
      return;
    }

    const messageTime = formatSesLocalMessageTime(new Date());
    const optimistic = createOptimisticOutboundMessage({
      chatId: state.activeChatId,
      senderId: currentUser.id,
      senderRole: "customer",
      text: text.trim(),
      attachments,
      messageTime,
    });
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, optimistic],
      chats: prev.chats.map((c) =>
        c.id === state.activeChatId
          ? { ...c, lastMessage: optimistic }
          : c,
      ),
    }));

    client.send({
      type: "send-message",
      payload: {
        chatId: state.activeChatId,
        text,
        sender: currentUser,
        attachments,
        messageTime,
        msgtime: messageTime,
      },
    });
    if (files?.length) {
      const activeChat = state.chats.find((c) => c.id === state.activeChatId);
      const agentIdForEndOfFile = activeChat?.agent?.id?.toString() ?? "";
      try {
        await sendFileChunksViaWebSocket(client, files, {
          userId: currentUser.id.toString(),
          chatroomId: state.activeChatId,
          domainIndex: state.domainIndex,
          chatFrom: state.chatFrom,
          message: text,
          agentId: agentIdForEndOfFile,
          messageFrom: "0",
          messageTime,
        });
      } catch (e) {
        console.error("[ws-file] upload failed", e);
        toast.error(
          e instanceof Error ? e.message : "File upload failed. Try again.",
        );
      }
    }
  };

  const removeActiveChatAfterHandoff = (chatId: string) => {
    setState((prev) => ({
      ...prev,
      chats: prev.chats.filter((c) => c.id !== chatId),
      activeChatId: prev.activeChatId === chatId ? null : prev.activeChatId,
      messages: prev.messages.filter((m) => m.chatId !== chatId),
    }));
  };

  /** After transfer-to-queue HTTP success: keep the row in the list as queued (avoids racing WS `new-chat-in-queue`). */
  const demoteChatToQueueInState = (chatId: string) => {
    setState((prev) => {
      const hasChat = prev.chats.some((c) => c.id === chatId);
      if (!hasChat) {
        return {
          ...prev,
          activeChatId: prev.activeChatId === chatId ? null : prev.activeChatId,
        };
      }
      return {
        ...prev,
        chats: prev.chats.map((c) =>
          c.id === chatId
            ? { ...c, status: "queued" as const, agent: undefined }
            : c,
        ),
        activeChatId: prev.activeChatId === chatId ? null : prev.activeChatId,
      };
    });
  };

  const transferToQueue = () => {
    if (!currentUser || currentUser.role !== "agent" || !state.activeChatId) {
      return;
    }
    const chatId = state.activeChatId;
    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat) return;
    if (state.domainIndex === null || state.chatFrom === null) {
      toast.error("Unable to transfer this chat right now.");
      return;
    }
    const chatIndex = getChatIndexForApi(chat);
    if (chatIndex === null || String(chatIndex).trim() === "") {
      toast.error("Unable to transfer this chat right now.");
      return;
    }

    void (async () => {
      try {
        const status = await transferChannelChat(
          apiUrls,
          chatIndex,
          state.domainIndex!,
          state.chatFrom!,
          currentUser.id,
          0,
          false,
        );
        if (status === null) {
          toast.error("Unable to transfer this chat right now.");
          return;
        }
        if (status === 0) {
          toast.error("Unable to transfer this chat right now.");
          return;
        }
        if (status === 1) {
          toast.success("Chat transferred to queue.");
          demoteChatToQueueInState(chatId);
          return;
        }
        if (status === 2) {
          toast.info("This chat is already closed.");
          removeActiveChatAfterHandoff(chatId);
          return;
        }
        if (status === 3) {
          toast.info("Self-assignment isn't allowed - pick another agent.");
          removeActiveChatAfterHandoff(chatId);
          return;
        }
        toast.error("Unable to transfer this chat right now.");
      } catch {
        toast.error("Unable to transfer this chat right now.");
      }
    })();
  };

  const transferToAgent = (agentId: string, agentName: string) => {
    if (!currentUser || currentUser.role !== "agent" || !state.activeChatId) {
      return;
    }
    const agentIndex = Number(String(agentId).trim());
    if (!Number.isFinite(agentIndex)) {
      toast.error("Invalid agent selected.");
      return;
    }
    const chatId = state.activeChatId;
    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat) return;
    if (state.domainIndex === null || state.chatFrom === null) {
      toast.error("Unable to transfer this chat right now.");
      return;
    }
    const chatIndex = getChatIndexForApi(chat);
    if (chatIndex === null || String(chatIndex).trim() === "") {
      toast.error("Unable to transfer this chat right now.");
      return;
    }

    void (async () => {
      try {
        const status = await transferChannelChat(
          apiUrls,
          chatIndex,
          state.domainIndex!,
          state.chatFrom!,
          currentUser.id,
          agentIndex,
          true,
        );
        if (status === null) {
          toast.error("Unable to transfer this chat right now.");
          return;
        }
        if (status === 0) {
          toast.error("Unable to transfer this chat right now.");
          return;
        }
        if (status === 1) {
          toast.success(`Chat transferred to ${agentName}.`);
          removeActiveChatAfterHandoff(chatId);
          return;
        }
        if (status === 2) {
          toast.info("This chat is already closed.");
          removeActiveChatAfterHandoff(chatId);
          return;
        }
        if (status === 3) {
          toast.info("Self-assignment isn't allowed - pick another agent.");
          return;
        }
        toast.error("Unable to transfer this chat right now.");
      } catch {
        toast.error("Unable to transfer this chat right now.");
      }
    })();
  };

  const resolveChat = () => {
    if (!currentUser || !state.activeChatId) return;
    const chatId = state.activeChatId;
    const chat = state.chats.find((c) => c.id === chatId);

    if (
      currentUser.role === "agent" &&
      chat &&
      state.domainIndex !== null &&
      state.chatFrom !== null
    ) {
      const domainIndex = state.domainIndex;
      const chatFrom = state.chatFrom;
      const chatIndex = getChatIndexForApi(chat);
      if (chatIndex === null || String(chatIndex).trim() === "") {
        toast.error("Unable to close this chat right now.");
        return;
      }
      void (async () => {
        try {
          const status = await closeChannelChat(
            apiUrls,
            chatIndex,
            domainIndex,
            chatFrom,
            currentUser.id,
          );
          if (status === 1) {
            toast.success("Chat has been closed.");
            setState((prev) => ({
              ...prev,
              chats: prev.chats.filter((c) => c.id !== chatId),
              activeChatId: prev.activeChatId === chatId ? null : prev.activeChatId,
              messages: prev.messages.filter((m) => m.chatId !== chatId),
            }));
            return;
          }
          if (status === 2) {
            toast.info("This chat is already closed.");
            setState((prev) => ({
              ...prev,
              chats: prev.chats.filter((c) => c.id !== chatId),
              activeChatId: prev.activeChatId === chatId ? null : prev.activeChatId,
              messages: prev.messages.filter((m) => m.chatId !== chatId),
            }));
            return;
          }
          toast.error("Unable to close this chat right now.");
        } catch {
          toast.error("Unable to close this chat right now.");
        }
      })();
      return;
    }

    client.send({
      type: "resolve-chat",
      payload: { chatId, agent: currentUser },
    });
    setState((prev) => ({ ...prev, activeChatId: null }));
  };

  const selectChat = (chatId: string) => {
    void (async () => {
      if (!currentUser || currentUser.role !== "agent") return;
      const chat = state.chats.find((c) => c.id === chatId);
      if (!chat || chat.status === "queued") return;
      const chatIndex = getChatIndexForApi(chat);
      if (chatIndex === null || String(chatIndex) === "") {
        toast.error("Unable to load this chat right now.");
        return;
      }
      if (state.domainIndex === null || state.chatFrom === null) {
        toast.error("Unable to load this chat right now.");
        return;
      }

      try {
        const { sessionStatus, isChatActive, messages, ticketList } =
          await fetchConversationByChatIndex(
            apiUrls,
            chatIndex,
            chatId,
            currentUser.id,
            chat.customer.id,
          );

        if (isChatActive === false) {
          toast.info("This chat is already closed.");
          removeActiveChatAfterHandoff(chatId);
          return;
        }

        const useLegacySession = isChatActive === null;
        if (useLegacySession && sessionStatus === 1) {
          toast.error("Chat has been closed due to a session timeout!");
          return;
        }
        if (useLegacySession) {
          const sessionOk = sessionStatus === 0 || sessionStatus === null;
          if (!sessionOk) {
            toast.error("Unable to load this chat right now.");
            return;
          }
        }

        setState((prev) => {
          let pending = prev.pendingSeenByMsgId;
          const merged = messages.map((m) => {
            const a = applyPendingSeenToMessage(m, pending);
            pending = a.pending;
            return a.message;
          });
          const chatActivePatch =
            isChatActive === null ? {} : { isChatActive };
          return {
            ...prev,
            activeChatId: chatId,
            chats: prev.chats.map((c) =>
              c.id === chatId
                ? { ...c, ...chatActivePatch, ticketList, counts: 0 }
                : c,
            ),
            messages: [
              ...prev.messages.filter((m) => m.chatId !== chatId),
              ...merged,
            ],
            pendingSeenByMsgId: pending,
          };
        });

        client.sendRaw({
          chatroomId: chatId.toString(),
          userId: currentUser.id.toString(),
          domainIndex: state.domainIndex,
          chatFrom: state.chatFrom,
          type: "AgentLiveChatStart",
        });
      } catch {
        toast.error("Unable to load this chat right now.");
      }
    })();
  };

  const refreshActiveChatTickets = useCallback(async () => {
    if (!currentUser || currentUser.role !== "agent") return;
    if (ticketListFetchInFlightRef.current) return;
    const snap = stateRef.current;
    const chatId = snap.activeChatId;
    if (!chatId) return;
    const chat = snap.chats.find((c) => c.id === chatId);
    if (!chat) return;
    const chatIndex = getChatIndexForApi(chat);
    if (chatIndex === null || String(chatIndex).trim() === "") {
      toast.error("Unable to load tickets for this chat right now.");
      return;
    }
    ticketListFetchInFlightRef.current = true;
    setState((prev) => ({ ...prev, ticketListLoading: true }));
    try {
      const ticketList = await fetchTicketListByChatId(
        apiUrls,
        chatIndex,
        currentUser.id,
      );
      setState((prev) => ({
        ...prev,
        ticketListLoading: false,
        chats:
          prev.activeChatId === chatId
            ? prev.chats.map((c) =>
                c.id === chatId ? { ...c, ticketList } : c,
              )
            : prev.chats,
      }));
    } catch (e) {
      setState((prev) => ({ ...prev, ticketListLoading: false }));
      toast.error(
        e instanceof Error ? e.message : "Unable to load tickets right now.",
      );
    } finally {
      ticketListFetchInFlightRef.current = false;
    }
  }, [apiUrls, currentUser]);

  return {
    channelKey: channelConfig.key,
    createTicketReviewUrl: apiUrls.createTicketReviewByChatId,
    /** Logged-in agent from SES session (`userId`); null until queue loads / fallback. */
    currentAgent: currentUser,
    chats: state.chats,
    messages: state.messages,
    queue,
    myChats,
    activeChat,
    activeMessages,
    activeChatId: state.activeChatId,
    isInitialLoading: state.isInitialLoading,
    showQueue: state.showQueue,
    domainIndex: state.domainIndex,
    moduleIndex: state.moduleIndex,
    transferAgents: state.transferAgents,
    ticketDomains: state.ticketDomains,
    ticketEmailTemplates: state.ticketEmailTemplates,
    ticketSmsTemplates: state.ticketSmsTemplates,
    awayReasons: state.awayReasons,
    ticketListLoading: state.ticketListLoading,
    startChat,
    claimChat,
    sendMessage,
    transferToQueue,
    transferToAgent,
    resolveChat,
    selectChat,
    refreshActiveChatTickets,
  };
}
