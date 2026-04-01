"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatWebSocketClient } from "../lib/websocket/client";
import type { Attachment, Chat, Message, User } from "../lib/chat/types";
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
  const id = `wa-${String(row.chatIndex)}`;
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
    messageTimeDisplay: row.messageTime.trim() || undefined,
    whatsappChatIndex: row.chatIndex,
  };
}

type LoadConversationApiRow = Record<string, unknown>;

function inferSenderRole(row: LoadConversationApiRow): "agent" | "customer" {
  const sr = row.senderRole ?? row.sender_type ?? row.role;
  if (typeof sr === "string") {
    const s = sr.toLowerCase();
    if (s === "agent" || s === "user" || s === "me") return "agent";
    if (s === "customer" || s === "client") return "customer";
  }
  if (typeof row.fromAgent === "boolean") return row.fromAgent ? "agent" : "customer";
  if (typeof row.fromCustomer === "boolean")
    return row.fromCustomer ? "customer" : "agent";
  if (typeof row.isAgent === "boolean") return row.isAgent ? "agent" : "customer";
  return "customer";
}

function mapApiRowToMessage(
  row: LoadConversationApiRow,
  chatId: string,
  index: number,
  agentUserId: string,
  customerId: string,
): Message {
  const id = String(
    row.id ?? row.messageId ?? row.msgId ?? `wa-msg-${chatId}-${index}`,
  );
  const text = String(
    row.text ?? row.message ?? row.msg ?? row.body ?? row.content ?? "",
  );
  const rawTime = String(
    row.createdAt ??
      row.messageTime ??
      row.timestamp ??
      row.time ??
      row.date ??
      "",
  );
  const createdAt = rawTime ? parseMessageTime(rawTime) : new Date().toISOString();
  const senderRole = inferSenderRole(row);
  const senderId =
    typeof row.senderId === "string"
      ? row.senderId
      : senderRole === "agent"
        ? agentUserId
        : customerId;

  return {
    id,
    chatId,
    senderId,
    senderRole,
    text,
    createdAt,
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

async function fetchConversationByChatIndex(
  chatIndex: string | number,
  chatId: string,
  agentUserId: string,
  customerId: string,
): Promise<Message[]> {
  const url = new URL(getLoadConversationUrl());
  url.searchParams.set("chatIndex", String(chatIndex));
  if (shouldSendUserIdInParams()) {
    url.searchParams.set("Userid", agentUserId);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    credentials: "omit",
  });
  if (!res.ok) {
    throw new Error(`loadConversation failed: ${res.status}`);
  }
  const json: unknown = await res.json();
  return parseLoadConversationMessages(json, chatId, agentUserId, customerId);
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
    credentials: "omit",
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
    credentials: "omit",
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
}

const initialState: State = {
  chats: [],
  messages: [],
  activeChatId: null,
  domainIndex: null,
  chatFrom: null,
};

function mergeChatsById(prev: Chat[], incoming: Chat[]): Chat[] {
  const map = new Map<string, Chat>();
  prev.forEach((c) => map.set(c.id, c));
  incoming.forEach((c) => map.set(c.id, c));
  return Array.from(map.values());
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
          chats: mergeChatsById(prev.chats, result.chats),
          messages: prev.messages,
          activeChatId: prev.activeChatId,
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

  const conversationLoadKey = useMemo(() => {
    if (!state.activeChatId) return null;
    const chat = state.chats.find((c) => c.id === state.activeChatId);
    if (
      chat?.whatsappChatIndex === undefined ||
      chat?.whatsappChatIndex === null
    ) {
      return null;
    }
    return `${chat.id}:${String(chat.whatsappChatIndex)}`;
  }, [state.activeChatId, state.chats]);

  useEffect(() => {
    if (!currentUser || currentUser.role !== "agent") return;
    if (!conversationLoadKey) return;
    const chatId = state.activeChatId;
    if (!chatId) return;
    const chat = state.chats.find((c) => c.id === chatId);
    if (
      chat?.whatsappChatIndex === undefined ||
      chat?.whatsappChatIndex === null
    ) {
      return;
    }

    let cancelled = false;
    fetchConversationByChatIndex(
      chat.whatsappChatIndex,
      chatId,
      currentUser.id,
      chat.customer.id,
    )
      .then((loaded) => {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          messages: [
            ...prev.messages.filter((m) => m.chatId !== chatId),
            ...loaded,
          ],
        }));
      })
      .catch(() => {
        // API may fail (CORS, network); keep existing / WS messages.
      });

    return () => {
      cancelled = true;
    };
  }, [conversationLoadKey, currentUser?.id, currentUser?.role]); // eslint-disable-line react-hooks/exhaustive-deps -- load when selected WhatsApp chat changes

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
            const hasMsg = prev.messages.some(
              (m) => m.id === event.payload.firstMessage.id,
            );
            return {
              ...prev,
              chats: hasChat
                ? prev.chats.map((c) => (c.id === chat.id ? chat : c))
                : [...prev.chats, chat],
              messages: hasMsg
                ? prev.messages
                : [...prev.messages, event.payload.firstMessage],
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
            if (prev.messages.some((m) => m.id === event.payload.message.id)) {
              return prev;
            }
            return {
              ...prev,
              messages: [...prev.messages, event.payload.message],
              chats: prev.chats.map((c) =>
                c.id === event.payload.message.chatId
                  ? { ...c, lastMessage: event.payload.message }
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
          default:
            return prev;
        }
      });
    });
    return () => {
      unsubscribe();
    };
  }, [client, currentUser?.id]);

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
  const activeMessages = useMemo(
    () =>
      state.activeChatId
        ? state.messages.filter((m) => m.chatId === state.activeChatId)
        : [],
    [state.messages, state.activeChatId],
  );

  const startChat = (text: string, attachments?: Attachment[]) => {
    if (!currentUser) return;
    client.send({
      type: "customer-start-chat",
      payload: { customer: currentUser, text, attachments },
    });
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
        activeChatId: chatId,
        chats: prev.chats.map((c) =>
          c.id === chatId ? { ...c, status: "assigned", agent: currentUser } : c,
        ),
      }));

      // Keep websocket state in sync for other listeners.
      client.send({
        type: "agent-claim-chat",
        payload: { chatId, agent: currentUser },
      });
    } catch {
      toast.error("Unable to assign this chat right now.");
    }
  };

  const sendMessage = (text: string, attachments?: Attachment[]) => {
    if (!currentUser || !state.activeChatId) return;
    client.send({
      type: "send-message",
      payload: {
        chatId: state.activeChatId,
        text,
        sender: currentUser,
        attachments,
      },
    });
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
    setState((prev) => ({ ...prev, activeChatId: chatId }));
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
