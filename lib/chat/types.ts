export type Role = "agent" | "customer";

export type ChatStatus = "queued" | "assigned" | "resolved";

export type OnlineStatus = "online" | "away" | "offline";

/** Row from SES `loadConversationById` → `ticketList`. */
export interface CustomerChatTicket {
  ticketNo: string;
  ticketStatus: string;
  ticketRegisteredAt: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  region?: string;
  plan?: string;
  onlineStatus?: OnlineStatus;
}

export interface Chat {
  id: string;
  customer: User;
  agent?: User;
  status: ChatStatus;
  lastMessage?: Message;
  createdAt: string;
  /** Raw time from API for display (e.g. "3/21/26"); when set, sidebar uses this instead of formatting createdAt. */
  messageTimeDisplay?: string;
  /** WhatsApp / SES chat index for `loadConversationById` API. */
  whatsappChatIndex?: string | number;
  /** When known (queue API / loadConversation), drives sidebar status dot: active = green. */
  isChatActive?: boolean;
  /** From queue API when present — last agent who had this conversation. */
  lastAssignedAgent?: string;
  /** Populated after `loadConversationById` when the API includes `ticketList`. */
  ticketList?: CustomerChatTicket[];
}

export interface Attachment {
  id: string;
  type: "image" | "video" | "document" | "audio";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export interface Message {
  /** From API (`msgIndex`, etc.) when provided; omit for outbound / some WS payloads. */
  id?: string;
  chatId: string;
  senderId: string;
  senderRole: Role;
  text: string;
  /** ISO timestamp for ordering; may be derived when the server only sends a clock time. */
  createdAt: string;
  /**
   * Clock label from the API/WebSocket (e.g. `messageTime` / `msgtime`).
   * May include seconds for ordering. UI: `formatMessageTimeForDisplay`. Send: `formatSesLocalMessageTime`.
   */
  messageTime?: string;
  /** SES day bucket for grouping (e.g. "Today", "Yesterday", or a date string). */
  messageHeader?: string;
  system?: boolean;
  attachments?: Attachment[];
  /** SES `CHAT_SEEN`: `3` = delivered (gray ✓✓), `4` = seen (blue ✓✓). */
  chatSeenStatus?: 3 | 4;
}

export type OutgoingEvent =
  | {
      type: "login";
      payload: { user: User };
    }
  | {
      type: "customer-start-chat";
      payload: {
        customer: User;
        text: string;
        attachments?: Attachment[];
        /** Local time with seconds for SES ordering (e.g. `9:50:15 AM`). */
        messageTime?: string;
        /** Same clock as `messageTime` when the SES backend expects `msgtime`. */
        msgtime?: string;
      };
    }
  | {
      type: "agent-claim-chat";
      payload: { chatId: string; agent: User };
    }
  | {
      type: "send-message";
      payload: {
        chatId: string;
        text: string;
        sender: User;
        attachments?: Attachment[];
        /** Local time with seconds for SES ordering (e.g. `9:50:15 AM`). */
        messageTime?: string;
        /** Same clock as `messageTime` when the SES backend expects `msgtime`. */
        msgtime?: string;
      };
    }
  | {
      type: "resolve-chat";
      payload: { chatId: string; agent: User };
    };

export type IncomingEvent =
  | {
      type: "chat-queued";
      payload: { chat: Chat; firstMessage: Message };
    }
  | {
      type: "chat-assigned";
      payload: { chat: Chat };
    }
  | {
      type: "message";
      payload: { message: Message };
    }
  | {
      type: "chat-updated";
      payload: { chat: Chat };
    }
  | {
      type: "remove-from-queue";
      payload: { chatId: string };
    }
  | {
      /** SES WebSocket `NEW_CHAT_IN_QUEUE` — same row shape as queue API after `getQueueNAssignedChats`. */
      type: "new-chat-in-queue";
      payload: { data: Record<string, unknown> };
    }
  | {
      type: "chat-seen";
      payload: { msgId: string; status: 3 | 4 };
    }
  | {
      /** SES WebSocket `CHAT_TRANSFER` notifying chat ownership changes. */
      type: "chat-transfer";
      payload: {
        chatId: string;
        userName?: string;
        chatStatus?: number;
        domainIndex?: number;
        chatFrom?: number;
      };
    };

