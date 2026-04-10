import {
  createdAtFromMessageHeaderAndTime,
  formatSesLocalMessageTime,
  splitSesMessageHeader,
  tryFormatMessageTimeForSesWire,
} from "../chat/sesMessageTime";
import { parseSesSeenStatusFromFields } from "../chat/sesChatSeenStatus";
import {
  attachmentsFromSesFields,
  stripSesPlaceholderCaption,
} from "../chat/sesMedia";
import type { IncomingEvent, Message, OutgoingEvent } from "../chat/types";

type Listener = (event: IncomingEvent) => void;
type OpenListener = (info: { isReconnect: boolean }) => void;
type InitializerPayload = object;

type BinaryFileAckWaiter = {
  resolve: () => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * SES file-transfer signals (msgtype `2`):
 * - `R` = ready for next frame (after JSON metadata or between chunks)
 * - `C` = chunk received / continue (seen after each binary chunk on some gateways)
 */
function isSesBinaryFileReadyAckPayload(o: Record<string, unknown>): boolean {
  const msg = o.msg ?? o.Msg;
  const mt =
    o.msgtype ?? o.msgType ?? o.messageType ?? o.MessageType ?? o.MsgType;
  const code = String(msg).trim().toUpperCase();
  const msgOk = code === "R" || code === "C";
  const typeOk =
    mt === 2 || mt === "2" || String(mt).trim() === "2";
  return msgOk && typeOk;
}

function isSesBinaryFileReadyAck(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (isSesBinaryFileReadyAckPayload(o)) return true;
  const data = o.data;
  if (data && typeof data === "object") {
    return isSesBinaryFileReadyAckPayload(data as Record<string, unknown>);
  }
  return false;
}

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
 * Same id resolution order as `NEW_MESSAGE` (`pickBackendMessageId`) so `CHAT_SEEN`
 * matches the `Message.id` stored from the echo.
 */
function pickChatSeenMessageId(o: Record<string, unknown>): string | null {
  const md =
    o.msgDetails && typeof o.msgDetails === "object"
      ? (o.msgDetails as Record<string, unknown>)
      : o.msg_details && typeof o.msg_details === "object"
        ? (o.msg_details as Record<string, unknown>)
        : null;
  const cd =
    o.chatDetail && typeof o.chatDetail === "object"
      ? (o.chatDetail as Record<string, unknown>)
      : o.chat_detail && typeof o.chat_detail === "object"
        ? (o.chat_detail as Record<string, unknown>)
        : null;
  const data =
    o.data && typeof o.data === "object"
      ? (o.data as Record<string, unknown>)
      : null;

  if (md) {
    const id = pickBackendMessageId(md, o, cd ?? undefined);
    if (id) return id;
  }
  if (
    data &&
    (data.msgId != null ||
      data.messageId != null ||
      data.msgIndex != null ||
      data.id != null)
  ) {
    const id = pickBackendMessageId(data, o, cd ?? undefined);
    if (id) return id;
  }
  return pickBackendMessageId(o, o, cd ?? undefined);
}

/** Map SES / wire variants to `3` = delivered, `4` = seen (blue ticks). */
function parseSesChatSeenStatus(
  root: Record<string, unknown>,
  md: Record<string, unknown> | null,
  data: Record<string, unknown> | null,
): 3 | 4 | null {
  return (
    parseSesSeenStatusFromFields(root) ??
    parseSesSeenStatusFromFields(md) ??
    parseSesSeenStatusFromFields(data)
  );
}

/** SES read/delivery receipt: `CHAT_SEEN` with same id fields as `NEW_MESSAGE`. */
function tryNormalizeChatSeen(raw: unknown): IncomingEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const eventLabel = o.event ?? o.type ?? o.Type;
  if (String(eventLabel).toUpperCase() !== "CHAT_SEEN") return null;

  const msgId = pickChatSeenMessageId(o);
  if (!msgId) return null;

  const md =
    o.msgDetails && typeof o.msgDetails === "object"
      ? (o.msgDetails as Record<string, unknown>)
      : o.msg_details && typeof o.msg_details === "object"
        ? (o.msg_details as Record<string, unknown>)
        : null;
  const data =
    o.data && typeof o.data === "object"
      ? (o.data as Record<string, unknown>)
      : null;

  const status = parseSesChatSeenStatus(o, md, data);
  if (status === null) return null;

  return {
    type: "chat-seen",
    payload: { msgId, status },
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

  /** `messageType` is often on the envelope; merge so attachment gating matches SES rules. */
  const fieldsForAttachments: Record<string, unknown> = { ...md };
  if (
    fieldsForAttachments.msgType === undefined &&
    fieldsForAttachments.messageType === undefined &&
    fieldsForAttachments.MessageType === undefined
  ) {
    const t =
      o.msgType ?? o.messageType ?? o.MessageType ?? o.msgtype ?? o.MsgType;
    if (t !== undefined) {
      fieldsForAttachments.messageType = t;
    }
  }

  const attachments = attachmentsFromSesFields(
    fieldsForAttachments,
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
  private fileBinaryAckWaiters: BinaryFileAckWaiter[] = [];

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
        if (isSesBinaryFileReadyAck(raw)) {
          this.notifySesBinaryFileAck();
        }
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
      this.rejectAllBinaryFileAckWaiters(
        new Error(
          `WebSocket error while waiting for file ack: ${String(error)}`,
        ),
      );
      console.error("[ws] error", error);
    };
    this.socket.onclose = () => {
      this.rejectAllBinaryFileAckWaiters(
        new Error("WebSocket closed while waiting for file ack"),
      );
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

  /** Raw binary frame (SES legacy file chunks after JSON metadata). */
  sendBinary(buffer: ArrayBuffer): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("[ws-file] sendBinary skipped — socket not OPEN");
      return false;
    }
    try {
      this.socket.send(buffer);
      return true;
    } catch (e) {
      console.error("[ws-file] sendBinary threw", e);
      return false;
    }
  }

  /**
   * Resolves when the server sends `{ msg: "R" | "C", msgtype: 2 }` (or nested `data`).
   * FIFO: one ack resolves one waiter (metadata gate and/or per-chunk).
   */
  waitForSesBinaryFileAck(timeoutMs = 120_000): Promise<void> {
    return new Promise((resolve, reject) => {
      const entry: BinaryFileAckWaiter = {
        resolve: () => {},
        reject,
        timer: 0 as unknown as ReturnType<typeof setTimeout>,
      };
      entry.timer = setTimeout(() => {
        const i = this.fileBinaryAckWaiters.indexOf(entry);
        if (i >= 0) this.fileBinaryAckWaiters.splice(i, 1);
        reject(new Error("SES binary file ack timeout"));
      }, timeoutMs);
      entry.resolve = () => {
        clearTimeout(entry.timer);
        resolve();
      };
      this.fileBinaryAckWaiters.push(entry);
    });
  }

  private notifySesBinaryFileAck() {
    const w = this.fileBinaryAckWaiters.shift();
    if (!w) return;
    clearTimeout(w.timer);
    w.resolve();
  }

  private rejectAllBinaryFileAckWaiters(reason: Error) {
    while (this.fileBinaryAckWaiters.length > 0) {
      const w = this.fileBinaryAckWaiters.shift()!;
      clearTimeout(w.timer);
      w.reject(reason);
    }
  }

  sendRaw(payload: Record<string, unknown>) {
    const type = payload.type;
    const isFileFrame =
      type === "File" || type === "EndOfFile" || type === "file";

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      if (isFileFrame && typeof console !== "undefined") {
        const rs = this.socket?.readyState;
        console.warn("[ws-file] sendRaw skipped — socket not OPEN", {
          type,
          readyState: rs,
          readyStateLabel:
            rs === WebSocket.CONNECTING
              ? "CONNECTING"
              : rs === WebSocket.OPEN
                ? "OPEN"
                : rs === WebSocket.CLOSING
                  ? "CLOSING"
                  : rs === WebSocket.CLOSED
                    ? "CLOSED"
                    : String(rs),
          fileName: payload.fileName,
          chunkIndex: payload.chunkIndex,
        });
      }
      return;
    }

    let raw: string;
    try {
      raw = JSON.stringify(payload);
    } catch (e) {
      console.error("[ws-file] JSON.stringify failed", e, {
        type,
        fileName: payload.fileName,
        chunkIndex: payload.chunkIndex,
      });
      return;
    }

    if (isFileFrame && typeof console !== "undefined") {
      const chunkData =
        typeof payload.chunkData === "string"
          ? payload.chunkData
          : typeof payload.chunk_data === "string"
            ? payload.chunk_data
            : "";
      if (type === "File" || type === "file") {
        if (chunkData.length === 0) {
          console.log("[ws-file] outbound File metadata (JSON only, binary chunks follow)", {
            fileName: payload.fileName,
            fileSize: payload.fileSize,
            frameJsonChars: raw.length,
            userId: payload.userId,
          });
        } else {
          console.log("[ws-file] outbound File frame", {
            fileName: payload.fileName,
            fileSize: payload.fileSize,
            chunkIndex: payload.chunkIndex,
            chunkNumber: payload.chunkNumber,
            totalChunks: payload.totalChunks,
            chunkByteLength: payload.chunkByteLength,
            chunkDataChars: chunkData.length,
            frameJsonChars: raw.length,
            encoding: payload.encoding,
            chatroomId: payload.chatroomId,
          });
        }
      } else {
        console.log("[ws-file] outbound EndOfFile frame", {
          fileName: payload.fileName,
          fileSize: payload.fileSize,
          totalChunks: payload.totalChunks,
          frameJsonChars: raw.length,
          chatroomId: payload.chatroomId,
          messageLen:
            typeof payload.message === "string" ? payload.message.length : 0,
          Agentid: payload.Agentid,
        });
      }
    }

    try {
      this.socket.send(raw);
    } catch (e) {
      console.error("[ws-file] socket.send threw", e, {
        type,
        frameJsonChars: raw.length,
        fileName: payload.fileName,
      });
    }
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

