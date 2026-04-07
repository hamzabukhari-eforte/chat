import {
  createdAtFromMessageHeaderAndTime,
  enrichSesWireTimeIfSecondsWereZero,
  splitSesMessageHeader,
  tryFormatMessageTimeForSesWire,
} from "../chat/sesMessageTime";
import {
  attachmentsFromSesFields,
  stripSesPlaceholderCaption,
} from "../chat/sesMedia";
import type { IncomingEvent, Message, OutgoingEvent } from "../chat/types";

type Listener = (event: IncomingEvent) => void;
type InitializerPayload = object;

function tryNormalizeBackendEvent(raw: unknown): IncomingEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const eventName = o.event;
  if (typeof eventName !== "string") return null;
  if (eventName.toUpperCase() !== "REMOVE_FROM_QUEUE") return null;
  const message = o.message;
  if (typeof message !== "string" || !message.trim()) return null;
  return {
    type: "remove-from-queue",
    payload: { chatId: message.trim() },
  };
}

/** SES `NEW_CHAT_IN_QUEUE` after initial `getQueueNAssignedChats` load. */
function tryNormalizeNewChatInQueue(raw: unknown): IncomingEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (String(o.event).toUpperCase() !== "NEW_CHAT_IN_QUEUE") return null;
  const data = o.data;
  if (!data || typeof data !== "object") return null;
  return {
    type: "new-chat-in-queue",
    payload: { data: data as Record<string, unknown> },
  };
}

/**
 * Parses WS `msgtime` / `messageTime` into ISO for `createdAt` (today’s date when only a clock is sent).
 * Supports `09:36:06 AM`, `9:36 AM`, and 24h `14:30` / `14:30:45`.
 */
function parseWsMsgTime(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return new Date().toISOString();
  const direct = Date.parse(trimmed);
  if (!Number.isNaN(direct)) return new Date(direct).toISOString();
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(trimmed);
  if (m) {
    let h = Number(m[1]);
    const min = Number(m[2]);
    const sec = m[3] !== undefined ? Number(m[3]) : 0;
    const ap = m[4].toUpperCase();
    if (ap === "PM" && h !== 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const d = new Date();
    d.setHours(h, min, sec, 0);
    return d.toISOString();
  }
  const h24 = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (h24) {
    const hh = Number(h24[1]);
    const mm = Number(h24[2]);
    const ss = h24[3] !== undefined ? Number(h24[3]) : 0;
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && ss >= 0 && ss <= 59) {
      const d = new Date();
      d.setHours(hh, mm, ss, 0);
      return d.toISOString();
    }
  }
  return new Date().toISOString();
}

function pickBackendMessageId(
  md: Record<string, unknown>,
  root: Record<string, unknown>,
): string | null {
  const candidates = [
    md.msgIndex,
    md.messageId,
    md.msgId,
    md.id,
    md.messageUID,
    md.uniqueId,
    root.msgIndex,
    root.messageId,
    root.msgId,
    root.id,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    const s = String(c).trim();
    if (s !== "") return s;
  }
  return null;
}

/**
 * SES often sends `messageTime` with `:00` seconds. After normalization, replace that
 * with the current local second so the UI and sort keys reflect receive time.
 */
function enrichIncomingMessageTimes(event: IncomingEvent): IncomingEvent {
  if (event.type !== "message") return event;
  const msg = event.payload.message;
  const mt = msg.messageTime?.trim();
  if (!mt) return event;
  const normalizedClock = tryFormatMessageTimeForSesWire(mt) ?? mt;
  const withLiveSec = enrichSesWireTimeIfSecondsWereZero(normalizedClock);
  if (withLiveSec === mt && normalizedClock === mt) return event;
  return {
    type: "message",
    payload: {
      message: { ...msg, messageTime: withLiveSec },
    },
  };
}

/** SES `NEW_MESSAGE` → internal `message` event for the hook reducer. */
function tryNormalizeNewMessage(raw: unknown): IncomingEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (String(o.event).toUpperCase() !== "NEW_MESSAGE") return null;

  const chatDetail = o.chatDetail;
  const msgDetails = o.msgDetails;
  if (!chatDetail || typeof chatDetail !== "object") return null;
  if (!msgDetails || typeof msgDetails !== "object") return null;

  const cd = chatDetail as Record<string, unknown>;
  const md = msgDetails as Record<string, unknown>;

  const chatroomId = cd.chatroomId;
  const chatId =
    chatroomId !== undefined && chatroomId !== null
      ? String(chatroomId)
      : "";

  if (!chatId) return null;

  const text = String(md.message ?? "");
  const messageHeader = String(
    md.messageHeader ?? md.messageheader ?? "",
  ).trim();
  const embeddedClock = messageHeader
    ? splitSesMessageHeader(messageHeader).embeddedTime
    : "";
  const msgTimeRaw = String(
    md.msgtime ?? md.messageTime ?? md.msgTime ?? md.timestamp ?? "",
  ).trim() || embeddedClock;
  const messageTimeWire = msgTimeRaw
    ? tryFormatMessageTimeForSesWire(msgTimeRaw) ?? msgTimeRaw
    : undefined;
  const createdAt = messageHeader
    ? createdAtFromMessageHeaderAndTime(messageHeader, msgTimeRaw)
    : parseWsMsgTime(msgTimeRaw);

  // Prefer explicit boolean when provided (your payload uses `isFromAgent`).
  const isFromAgent = md.isFromAgent;
  const senderRole: Message["senderRole"] =
    typeof isFromAgent === "boolean"
      ? isFromAgent
        ? "agent"
        : "customer"
      : // Fallback to numeric field used by older payloads.
        (md.messagefrom === 1 ? "agent" : "customer");

  const assignTo = String(cd.chatAssignTo ?? "");
  const customerKey = String(
    cd.customerNumber ?? cd.uniqueKey ?? "customer",
  );

  const senderId =
    senderRole === "agent"
      ? (assignTo || "agent")
      : customerKey;

  const backendMessageId = pickBackendMessageId(md, o);
  const attIdBase =
    backendMessageId ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${chatId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  const attachments = attachmentsFromSesFields(
    md as Record<string, unknown>,
    `${attIdBase}-att`,
  );
  const displayText = stripSesPlaceholderCaption(
    text,
    Boolean(attachments?.length),
  );

  const message: Message = {
    chatId,
    senderId,
    senderRole,
    text: displayText,
    createdAt,
    ...(backendMessageId ? { id: backendMessageId } : {}),
    ...(messageTimeWire ? { messageTime: messageTimeWire } : {}),
    ...(messageHeader ? { messageHeader } : {}),
    ...(attachments?.length ? { attachments } : {}),
  };

  return {
    type: "message",
    payload: { message },
  };
}

function getDefaultWebSocketUrl(): string {
  // During build/static export there is no window; return a placeholder.
  if (typeof window === "undefined") {
    return "ws://localhost:3030";
  }

  const isHttps = window.location.protocol === "https:";
  const protocol = isHttps ? "wss:" : "ws:";
  const host = window.location.host; // includes hostname + :port

  // Adjust the path to match your backend WS endpoint.
  // Currently using /SES/WebLiveChat as provided by backend.
  const path = "/SES/WebLiveChat";

  return `${protocol}//${host}${path}`;
}

export class ChatWebSocketClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private url: string;
  private initializer: InitializerPayload | null = null;

  constructor(url = getDefaultWebSocketUrl()) {
    this.url = url;
  }

  setInitializer(initializer: InitializerPayload | null) {
    this.initializer = initializer;
    if (initializer && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(initializer));
    }
  }

  connect() {
    if (typeof window === "undefined") return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.socket = new WebSocket(this.url);
    this.socket.onopen = () => {
      console.log("[ws] connected to", this.url);
      if (this.initializer) {
        this.socket?.send(JSON.stringify(this.initializer));
      }
    };
    this.socket.onmessage = (event) => {
      try {
        const raw: unknown = JSON.parse(event.data);
        const normalized =
          tryNormalizeBackendEvent(raw) ??
          tryNormalizeNewMessage(raw) ??
          tryNormalizeNewChatInQueue(raw);
        const parsed = enrichIncomingMessageTimes(
          (normalized ?? raw) as IncomingEvent,
        );
        console.log("[ws] response", parsed);
        this.listeners.forEach((listener) => listener(parsed));
      } catch {
        // swallow
      }
    };
    this.socket.onerror = (error) => {
      console.error("[ws] error", error);
    };
    this.socket.onclose = () => {
      // very naive reconnect
      console.warn("[ws] disconnected, retrying in 2s");
      setTimeout(() => this.connect(), 2000);
    };
  }

  send(event: OutgoingEvent) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(event));
  }

  sendRaw(payload: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

