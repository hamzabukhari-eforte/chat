"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { messagesAreSameListItem, stableMessageListKey } from "../lib/chat/messageKey";
import {
  createdAtFromMessageHeaderAndTime,
  formatMessageTimeForDisplay,
  formatSesLocalMessageTime,
  splitSesMessageHeader,
} from "../lib/chat/sesMessageTime";
import {
  attachmentsFromSesFields,
  stripSesPlaceholderCaption,
} from "../lib/chat/sesMedia";
import {
  chunkCountForFileSize,
  FILE_CHUNK_SIZE_BYTES,
  readFileChunkAsBase64,
} from "../lib/chat/fileChunks";
import type { Attachment, Chat, Message, Role, User } from "../lib/chat/types";
import { ChatWebSocketClient } from "../lib/websocket/client";
import { toast } from "sonner";

const DEFAULT_QUEUE_CHATS_URL =
  "http://10.0.10.53:8080/SES/SocialMedia/whatsapp/getQueueNAssignedChats";

const DEFAULT_LOAD_CONVERSATION_URL =
  "http://10.0.10.53:8080/SES/SocialMedia/whatsapp/loadConversationById";
const DEFAULT_ASSIGN_CHAT_URL =
  "http://10.0.10.53:8080/SES/SocialMedia/whatsapp/assignChat";
const DEFAULT_CHAT_WS_URL = "ws://10.0.10.53:8080/SES/WebLiveChat";

function getChatWebSocketUrl(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_CHAT_WS_URL
      ? process.env.NEXT_PUBLIC_CHAT_WS_URL
      : undefined;
  return fromEnv ?? DEFAULT_CHAT_WS_URL;
}

function getLoadConversationUrl(): string {
  const fromEnv =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_LOAD_CONVERSATION_URL
      ? process.env.NEXT_PUBLIC_LOAD_CONVERSATION_URL
      : undefined;
  return (fromEnv ?? DEFAULT_LOAD_CONVERSATION_URL).replace(/\/$/, "");
}

function getQueueChatsUrl(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_QUEUE_CHATS_URL
      ? process.env.NEXT_PUBLIC_QUEUE_CHATS_URL
      : undefined;
  return (fromEnv ?? DEFAULT_QUEUE_CHATS_URL).replace(/\/$/, "");
}

function shouldSendUserIdInParams(): boolean {
  return (
    typeof process !== "undefined" && process.env.NODE_ENV === "development"
  );
}

function getApiFetchCredentials(): RequestCredentials {
  return shouldSendUserIdInParams() ? "omit" : "include";
}

function getAssignChatUrl(): string {
  const fromEnv =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_ASSIGN_CHAT_URL
      ? process.env.NEXT_PUBLIC_ASSIGN_CHAT_URL
      : undefined;
  return (fromEnv ?? DEFAULT_ASSIGN_CHAT_URL).replace(/\/$/, "");
}

interface QueueNAssignedRow {
  number: string;
  messageTime: string;
  country: string | null;
  city: string | null;
  profilePic: string;
  lastMsg: string;
  userName: string;
  region: string | null;
  chatIndex: string | number;
  email: string;
  counts?: number;
}

interface QueueNAssignedChatsResponse {
  domainIndex?: number;
  chatFrom?: number;
  userId?: string;
  queueChats: QueueNAssignedRow[];
  queueCount: number;
  assignedCount: number;
  assignedChats: QueueNAssignedRow[];
}

interface BackendWsInitializer {
  chatroomId: "0";
  userId: string;
  type: "initializer";
  From: "Agent";
  domainIndex: number;
  chatFrom: number;
}

function parseMessageTime(raw: string): string {
  const trimmed = raw.trim();
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct.toISOString();

  const ampm = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(trimmed);
  if (ampm) {
    let h = Number(ampm[1]);
    const min = Number(ampm[2]);
    const sec = ampm[3] !== undefined ? Number(ampm[3]) : 0;
    const ap = ampm[4].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const d = new Date();
    d.setHours(h, min, sec, 0);
    return d.toISOString();
  }

  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(trimmed);
  if (m) {
    const month = Number(m[1]) - 1;
    const day = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const dt = new Date(year, month, day);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString();
  }
  return new Date().toISOString();
}

function mapQueueRowToChat(
  row: QueueNAssignedRow,
  status: "queued" | "assigned",
  agentUser?: User,
): Chat {
  const id = String(row.chatIndex);
  const customer: User = {
    id: row.email || row.number,
    name: row.userName?.trim() || row.number,
    role: "customer",
    avatar: row.profilePic?.trim() ? row.profilePic : undefined,
    email: row.email,
    phone: row.number,
    city: row.city?.trim() || undefined,
    country: row.country?.trim() || undefined,
    region: row.region?.trim() || undefined,
  };

  let lastMessage: Message | undefined;
  if (row.lastMsg?.trim()) {
    lastMessage = {
      id: `last-${id}`,
      chatId: id,
      senderId: customer.id,
      senderRole: "customer",
      text: row.lastMsg,
      createdAt: parseMessageTime(row.messageTime),
    };
  }

  return {
    id,
    customer,
    agent: status === "assigned" ? agentUser : undefined,
    status,
    lastMessage,
    createdAt: parseMessageTime(row.messageTime),
    messageTimeDisplay:
      row.messageTime.trim() !== ""
        ? formatMessageTimeForDisplay(row.messageTime)
        : undefined,
    whatsappChatIndex: row.chatIndex,
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
  };
  return mapQueueRowToChat(row, "queued");
}

type LoadConversationApiRow = Record<string, unknown>;

/**
 * API `loadConversationById` rows only (WebSocket `NEW_MESSAGE` uses `lib/websocket/client.ts`).
 * `isFromAgent === true` → agent (right); else customer (left).
 */
function inferSenderRole(row: LoadConversationApiRow): "agent" | "customer" {
  const merged: Record<string, unknown> = { ...row };
  if (row.msgDetails && typeof row.msgDetails === "object") {
    Object.assign(merged, row.msgDetails as Record<string, unknown>);
  }

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

  const fields: Record<string, unknown> = { ...row };
  delete fields.msgDetails;
  if (row.msgDetails && typeof row.msgDetails === "object") {
    Object.assign(fields, row.msgDetails as Record<string, unknown>);
  }

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
  const senderId =
    typeof row.senderId === "string"
      ? row.senderId
      : senderRole === "agent"
        ? agentUserId
        : customerId;

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
  const attachments = attachmentsFromSesFields(fields, attachmentIdPrefix);
  const displayText = stripSesPlaceholderCaption(
    text,
    Boolean(attachments?.length),
  );

  return {
    ...(id ? { id } : {}),
    chatId,
    senderId,
    senderRole,
    text: displayText,
    createdAt,
    ...(messageTime ? { messageTime } : {}),
    ...(messageHeader ? { messageHeader } : {}),
    ...(attachments?.length ? { attachments } : {}),
  };
}

function parseLoadConversationMessages(
  json: unknown,
  chatId: string,
  agentUserId: string,
  customerId: string,
): Message[] {
  let rows: LoadConversationApiRow[] = [];
  if (Array.isArray(json)) {
    rows = json as LoadConversationApiRow[];
  } else if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    if (Array.isArray(o.messages)) rows = o.messages as LoadConversationApiRow[];
    else if (Array.isArray(o.data)) rows = o.data as LoadConversationApiRow[];
    else if (Array.isArray(o.conversation))
      rows = o.conversation as LoadConversationApiRow[];
  }
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

async function fetchConversationByChatIndex(
  chatIndex: string | number,
  chatId: string,
  agentUserId: string,
  customerId: string,
): Promise<{ sessionStatus: number | null; messages: Message[] }> {
  const url = new URL(getLoadConversationUrl());
  url.searchParams.set("Userid", agentUserId);

  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: getApiFetchCredentials(),
    body: JSON.stringify({ chatIndex }),
  });
  if (!res.ok) {
    throw new Error(`loadConversation failed: ${res.status}`);
  }
  const json: unknown = await res.json();
  const sessionStatus = extractSessionStatus(json);
  const messages = parseLoadConversationMessages(
    json,
    chatId,
    agentUserId,
    customerId,
  );
  return { sessionStatus, messages };
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

async function fetchQueueAndAssignedChats(agent: User): Promise<{
  chats: Chat[];
  initializer: BackendWsInitializer | null;
  domainIndex: number | null;
  chatFrom: number | null;
}> {
  const url = new URL(getQueueChatsUrl());
  if (shouldSendUserIdInParams()) {
    url.searchParams.set("Userid", agent.id);
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: getApiFetchCredentials(),
  });
  if (!res.ok) {
    throw new Error(`Queue chats failed: ${res.status}`);
  }
  const data = (await res.json()) as QueueNAssignedChatsResponse;
  const queue = (data.queueChats ?? []).map((r) =>
    mapQueueRowToChat(r, "queued"),
  );
  const assigned = (data.assignedChats ?? []).map((r) =>
    mapQueueRowToChat(r, "assigned", agent),
  );
  const initializer =
    data.userId && data.domainIndex !== undefined && data.chatFrom !== undefined
      ? {
          chatroomId: "0" as const,
          userId: String(data.userId),
          type: "initializer" as const,
          From: "Agent" as const,
          domainIndex: Number(data.domainIndex),
          chatFrom: Number(data.chatFrom),
        }
      : null;

  return {
    chats: [...queue, ...assigned],
    initializer,
    domainIndex:
      data.domainIndex !== undefined ? Number(data.domainIndex) : null,
    chatFrom: data.chatFrom !== undefined ? Number(data.chatFrom) : null,
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

async function assignChatToAgent(
  chatIndex: string | number,
  domainIndex: number,
  chatFrom: number,
  userId: string,
): Promise<number | null> {
  const url = new URL(getAssignChatUrl());
  if (shouldSendUserIdInParams()) {
    url.searchParams.set("Userid", userId);
  }
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: getApiFetchCredentials(),
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

interface State {
  chats: Chat[];
  messages: Message[];
  activeChatId: string | null;
  domainIndex: number | null;
  chatFrom: number | null;
  /** `CHAT_SEEN` can arrive before `NEW_MESSAGE`; apply when a message with that `id` appears. */
  pendingSeenByMsgId: Record<string, 3 | 4>;
}

const initialState: State = {
  chats: [],
  messages: [],
  activeChatId: null,
  domainIndex: null,
  chatFrom: null,
  pendingSeenByMsgId: {},
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

function mergeChatsById(prev: Chat[], incoming: Chat[]): Chat[] {
  const map = new Map<string, Chat>();
  prev.forEach((c) => map.set(c.id, c));
  incoming.forEach((c) => map.set(c.id, c));
  return Array.from(map.values());
}

const OPTIMISTIC_MSG_ID_PREFIX = "optimistic-local:";

function createOptimisticOutboundMessage(params: {
  chatId: string;
  senderId: string;
  senderRole: Role;
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
    text: params.text,
    createdAt: new Date().toISOString(),
    messageTime: params.messageTime,
    ...(params.attachments?.length ? { attachments: params.attachments } : {}),
  };
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
  },
): Promise<void> {
  for (const file of files) {
    const totalChunks = chunkCountForFileSize(file.size);
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const chunkData = await readFileChunkAsBase64(
        file,
        chunkIndex,
        FILE_CHUNK_SIZE_BYTES,
      );
      const payload: Record<string, unknown> = {
        type: "File",
        userId: ctx.userId,
        chatroomId: ctx.chatroomId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        chunkIndex,
        totalChunks,
        chunkData,
      };
      if (ctx.domainIndex !== null) {
        payload.domainIndex = ctx.domainIndex;
      }
      if (ctx.chatFrom !== null) {
        payload.chatFrom = ctx.chatFrom;
      }
      client.sendRaw(payload);
    }

    const endOfFilePayload = {
      chatroomId: ctx.chatroomId,
      userId: ctx.userId,
      type: "EndOfFile" as const,
      Agentid: ctx.agentId,
      messagefrom: ctx.messageFrom,
      message: ctx.message,
      messageType: 2,
    };
    client.sendRaw(endOfFilePayload);
    console.log("[ws] EndOfFile sent (file transfer complete)", {
      fileName: file.name,
      chatroomId: ctx.chatroomId,
    });
  }
}

export function useWebSocketChat(currentUser: User | null) {
  const [state, setState] = useState<State>(initialState);

  const client = useMemo(
    () => new ChatWebSocketClient(getChatWebSocketUrl()),
    [],
  );

  useEffect(() => {
    if (!currentUser || currentUser.role !== "agent") return;

    let cancelled = false;
    fetchQueueAndAssignedChats(currentUser)
      .then((result) => {
        if (cancelled) return;
        client.setInitializer(result.initializer);
        setState((prev) => ({
          ...prev,
          chats: mergeChatsById(prev.chats, result.chats),
          domainIndex: result.domainIndex ?? prev.domainIndex,
          chatFrom: result.chatFrom ?? prev.chatFrom,
        }));
      })
      .catch(() => {
        // API optional; WebSocket demo may still update state.
      });

    return () => {
      cancelled = true;
    };
  }, [client, currentUser?.id, currentUser?.role]); // eslint-disable-line react-hooks/exhaustive-deps -- refetch on identity/role only

  useEffect(() => {
    const userId = currentUser?.id;
    client.connect();
    const unsubscribe = client.subscribe((event) => {
      setState((prev) => {
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
            /**
             * Match optimistic rows to server echo even when the server omits
             * `attachments` (common after chunked upload): normalize captions with
             * `hasAttachments: true` so "." / placeholders align.
             */
            const captionKey = (msg: Message) =>
              stripSesPlaceholderCaption(msg.text, true).trim();

            const incomingCaption = captionKey(incoming);

            const optimisticMatches = prev.messages.filter((m) => {
              if (!String(m.id ?? "").startsWith(OPTIMISTIC_MSG_ID_PREFIX))
                return false;
              if (m.chatId !== incoming.chatId) return false;
              if (m.senderId !== incoming.senderId) return false;
              if (m.senderRole !== incoming.senderRole) return false;
              return captionKey(m) === incomingCaption;
            });

            const withoutMatchingOptimistic = prev.messages.filter((m) => {
              if (!String(m.id ?? "").startsWith(OPTIMISTIC_MSG_ID_PREFIX))
                return true;
              if (m.chatId !== incoming.chatId) return true;
              if (m.senderId !== incoming.senderId) return true;
              if (m.senderRole !== incoming.senderRole) return true;
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

            if (
              withoutMatchingOptimistic.some((m) =>
                messagesAreSameListItem(m, mergedIncoming),
              )
            ) {
              if (withoutMatchingOptimistic.length === prev.messages.length) {
                return prev;
              }
              return { ...prev, messages: withoutMatchingOptimistic };
            }
            const applied = applyPendingSeenToMessage(
              mergedIncoming,
              prev.pendingSeenByMsgId,
            );
            return {
              ...prev,
              messages: [...withoutMatchingOptimistic, applied.message],
              pendingSeenByMsgId: applied.pending,
              chats: prev.chats.map((c) =>
                c.id === applied.message.chatId
                  ? { ...c, lastMessage: applied.message }
                  : c,
              ),
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
            const incoming = mapNewChatInQueueDataToChat(event.payload.data);
            if (!incoming) return prev;
            const existing = prev.chats.find((c) => c.id === incoming.id);
            const chat: Chat = {
              ...incoming,
              lastMessage: incoming.lastMessage ?? existing?.lastMessage,
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
            const key = String(msgId);
            const matched = prev.messages.some(
              (m) => m.id != null && String(m.id) === key,
            );
            const messages = prev.messages.map((m) =>
              m.id != null && String(m.id) === key
                ? { ...m, chatSeenStatus: st }
                : m,
            );
            if (matched) {
              const { [key]: _, ...rest } = prev.pendingSeenByMsgId;
              return { ...prev, messages, pendingSeenByMsgId: rest };
            }
            return {
              ...prev,
              messages,
              pendingSeenByMsgId: { ...prev.pendingSeenByMsgId, [key]: st },
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
  }, [client, currentUser?.id]);

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
      await sendFileChunksViaWebSocket(client, files, {
        userId: currentUser.id.toString(),
        chatroomId: "0",
        domainIndex: state.domainIndex,
        chatFrom: state.chatFrom,
        message: text,
        agentId: agentIdForEndOfFile,
        messageFrom,
      });
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

      client.sendRaw({
        chatroomId: state.activeChatId.toString(),
        userId: currentUser.id.toString(),
        // Keep file-message semantics consistent with normal non-chunk sends.
        message: t || ".",
        type: "Message",
        messagefrom: "1",
        messageType: "2",
      });

      await sendFileChunksViaWebSocket(client, fileList, {
        userId: currentUser.id.toString(),
        chatroomId: state.activeChatId,
        domainIndex: state.domainIndex,
        chatFrom: state.chatFrom,
        message: t,
        agentId: currentUser.id.toString(),
        messageFrom: "1",
      });
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
      await sendFileChunksViaWebSocket(client, files, {
        userId: currentUser.id.toString(),
        chatroomId: state.activeChatId,
        domainIndex: state.domainIndex,
        chatFrom: state.chatFrom,
        message: text,
        agentId: agentIdForEndOfFile,
        messageFrom: "0",
      });
    }
  };

  const resolveChat = () => {
    if (!currentUser || !state.activeChatId) return;
    client.send({
      type: "resolve-chat",
      payload: { chatId: state.activeChatId, agent: currentUser },
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
        const { sessionStatus, messages } = await fetchConversationByChatIndex(
          chatIndex,
          chatId,
          currentUser.id,
          chat.customer.id,
        );

        if (sessionStatus === 1) {
          toast.error("Chat has been closed due to a session timeout!");
          return;
        }

        const sessionOk = sessionStatus === 0 || sessionStatus === null;
        if (!sessionOk) {
          toast.error("Unable to load this chat right now.");
          return;
        }

        setState((prev) => {
          let pending = prev.pendingSeenByMsgId;
          const merged = messages.map((m) => {
            const a = applyPendingSeenToMessage(m, pending);
            pending = a.pending;
            return a.message;
          });
          return {
            ...prev,
            activeChatId: chatId,
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

  return {
    chats: state.chats,
    messages: state.messages,
    queue,
    myChats,
    activeChat,
    activeMessages,
    activeChatId: state.activeChatId,
    startChat,
    claimChat,
    sendMessage,
    resolveChat,
    selectChat,
  };
}
