import {
  createdAtFromMessageHeaderAndTime,
  formatSesLocalMessageTime,
  splitSesMessageHeader,
  tryFormatMessageTimeForSesWire,
} from "../chat/sesMessageTime";
import {
  attachmentsFromSesFields,
  stripSesPlaceholderCaption,
} from "../chat/sesMedia";
import type { IncomingEvent, Message, OutgoingEvent } from "../chat/types";

type Listener = (event: IncomingEvent) => void;
type OpenListener = (info: { isReconnect: boolean }) => void;
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

/** SES read/delivery receipt: `{ event: "CHAT_SEEN", msgId, status }`. */
function tryNormalizeChatSeen(raw: unknown): IncomingEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const isSesShape = String(o.event).toUpperCase() === "CHAT_SEEN";
  const data =
    o.data && typeof o.data === "object"
      ? (o.data as Record<string, unknown>)
      : null;
  if (!isSesShape) return null;

  const msgId =
    o.msgId ??
    o.messageId ??
    o.msgIndex ??
    data?.msgId ??
    data?.messageId ??
    data?.msgIndex;
  if (msgId === undefined || msgId === null) return null;

  const statusRaw =
    o.status ?? data?.status ?? data?.chatSeenStatus ?? data?.seenStatus;
  const status =
    typeof statusRaw === "number" ? statusRaw : Number(String(statusRaw).trim());
  if (Number.isNaN(status)) return null;

  return {
    type: "chat-seen",
    payload: { msgId: String(msgId).trim(), status },
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

/** Avoid treating `07:45:05 AM` as `Date.parse` input for fields named like `createdAt`. */
function looksLikePlainClockString(s: string): boolean {
  return (
    /^\d{1,2}:\d{2}/.test(s) &&
    !/^\d{4}-\d{2}-\d{2}/.test(s) &&
    !/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)
  );
}

function unixishMsToIso(n: number): string | null {
  const ms = n < 1e12 ? n * 1000 : n;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function coerceUnknownToIsoInstant(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return unixishMsToIso(raw);
  }
  const s = String(raw).trim();
  if (!s) return null;
  if (looksLikePlainClockString(s)) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Prefer an explicit instant from the wire (`createdAt`, unix `timestamp`, etc.)
 * before combining `messageHeader` + clock strings (server clocks often skew).
 */
function tryCanonicalCreatedAtFromFields(
  ...sources: Array<Record<string, unknown> | null | undefined>
): string | null {
  const keys = [
    "createdAt",
    "created_at",
    "messageDate",
    "msgDate",
    "dateTime",
    "DateTime",
    "utcDateTime",
  ] as const;
  for (const src of sources) {
    if (!src) continue;
    for (const key of keys) {
      const iso = coerceUnknownToIsoInstant(src[key]);
      if (iso) return iso;
    }
    const ts = src.timestamp ?? src.msgTimestamp;
    if (ts !== undefined && ts !== null) {
      if (typeof ts === "number" && Number.isFinite(ts)) {
        const iso = unixishMsToIso(ts);
        if (iso) return iso;
      } else if (typeof ts === "string" && /^\d+$/.test(ts.trim())) {
        const iso = unixishMsToIso(Number(ts.trim()));
        if (iso) return iso;
      }
    }
  }
  return null;
}

function pickBackendMessageId(
  md: Record<string, unknown>,
  root: Record<string, unknown>,
  cd?: Record<string, unknown>,
): string | null {
  const asObj = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  const data = asObj(root.data);
  /** Order: root/msgDetails fields that match `CHAT_SEEN.msgId` first. */
  const candidates: unknown[] = [
    root.msgId,
    md.msgId,
    md.msgIndex,
    md.messageId,
    md.id,
    md.messageUID,
    md.uniqueId,
    root.msgIndex,
    root.messageId,
    root.id,
    ...(cd
      ? [cd.msgId, cd.msgIndex, cd.messageId]
      : []),
    ...(data
      ? [data.msgId, data.msgIndex, data.messageId]
      : []),
  ];
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    const s = String(c).trim();
    if (s !== "") return s;
  }
  return null;
}

/**
 * Align `messageTime` with `createdAt`. The server clock string can disagree with the
 * ISO instant (zone / rounding); we also used to inject "live" seconds on `:00`, which
 * broke parity with `createdAt`. Derive the SES wire clock from the parsed instant.
 */
function enrichIncomingMessageTimes(event: IncomingEvent): IncomingEvent {
  if (event.type !== "message") return event;
  const msg = event.payload.message;
  const createdAt = msg.createdAt?.trim();
  if (!createdAt) return event;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return event;
  const wireFromInstant = formatSesLocalMessageTime(d);
  if (msg.messageTime?.trim() === wireFromInstant) return event;
  return {
    type: "message",
    payload: {
      message: { ...msg, messageTime: wireFromInstant },
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
  const dataPayload = o.data;
  let cd: Record<string, unknown>;
  let md: Record<string, unknown>;

  if (
    chatDetail &&
    typeof chatDetail === "object" &&
    msgDetails &&
    typeof msgDetails === "object"
  ) {
    cd = chatDetail as Record<string, unknown>;
    md = msgDetails as Record<string, unknown>;
  } else if (dataPayload && typeof dataPayload === "object") {
    const d = dataPayload as Record<string, unknown>;
    md = d;
    /** Flat `data` envelope: chat + message fields together (see SES `NEW_MESSAGE`). */
    cd = {
      chatroomId: d.chatId ?? d.chatroomId,
      chatAssignTo: String(
        d.AgentName ?? d.agentName ?? d.chatAssignTo ?? "",
      ).trim(),
      customerNumber: d.customerNumber ?? d.uniqueKey ?? d.customerPhone,
    };
  } else {
    return null;
  }

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
  /** Do not use `timestamp` here — it is often unix ms and must not be parsed as a clock. */
  const msgTimeRaw = String(
    md.msgtime ?? md.messageTime ?? md.msgTime ?? "",
  ).trim() || embeddedClock;
  const messageTimeWire = msgTimeRaw
    ? tryFormatMessageTimeForSesWire(msgTimeRaw) ?? msgTimeRaw
    : undefined;
  const createdAt =
    tryCanonicalCreatedAtFromFields(md, o) ??
    (messageHeader
      ? createdAtFromMessageHeaderAndTime(messageHeader, msgTimeRaw)
      : parseWsMsgTime(msgTimeRaw));

  // Prefer explicit boolean when provided (your payload uses `isFromAgent`).
  const isFromAgent = md.isFromAgent;
  const senderRole: Message["senderRole"] =
    typeof isFromAgent === "boolean"
      ? isFromAgent
        ? "agent"
        : "customer"
      : // `messagefrom` 1 = agent (SES); tolerate string "1".
        Number(md.messagefrom) === 1
        ? "agent"
        : "customer";

  const assignTo = String(cd.chatAssignTo ?? "");
  const customerKey = String(
    cd.customerNumber ?? cd.uniqueKey ?? "customer",
  );

  const senderId =
    senderRole === "agent"
      ? (assignTo || "agent")
      : customerKey;

  const backendMessageId = pickBackendMessageId(md, o, cd);
  /** Attachment row keys: prefer SES message id; otherwise chatroom id only (no client UUIDs). */
  const attachmentIdPrefix = backendMessageId
    ? `${backendMessageId}-att`
    : `${chatId}-media`;

  const attachments = attachmentsFromSesFields(
    md as Record<string, unknown>,
    attachmentIdPrefix,
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
  private openListeners = new Set<OpenListener>();
  private closedSinceLastOpen = false;
  private hasCompletedOpen = false;
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
      const isReconnect = this.hasCompletedOpen && this.closedSinceLastOpen;
      this.closedSinceLastOpen = false;
      this.hasCompletedOpen = true;
      console.log("[ws] connected to", this.url);
      if (this.initializer) {
        this.socket?.send(JSON.stringify(this.initializer));
      }
      this.openListeners.forEach((listener) => listener({ isReconnect }));
    };
    this.socket.onmessage = (event) => {
      try {
        const raw: unknown = JSON.parse(event.data);
        const normalized =
          tryNormalizeBackendEvent(raw) ??
          tryNormalizeNewMessage(raw) ??
          tryNormalizeNewChatInQueue(raw) ??
          tryNormalizeChatSeen(raw);
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
      this.closedSinceLastOpen = true;
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

  /** Runs after each successful open (initializer already sent). `isReconnect` is true only after a prior successful open and disconnect. */
  subscribeOpen(listener: OpenListener) {
    this.openListeners.add(listener);
    return () => {
      this.openListeners.delete(listener);
    };
  }
}

