export type Role = "agent" | "customer";

export type ChatStatus = "queued" | "assigned" | "resolved";

export type OnlineStatus = "online" | "away" | "offline";

/** Single follow-up row from SES ticket payload (`followupHistory`). */
export interface TicketFollowupEntry {
  statusColor?: string;
  statusText?: string;
  index?: number;
  remarks?: string;
  followupBy?: string;
  followupDate?: string;
}

export interface TicketAttachmentHistoryEntry {
  actual?: string;
  filename?: string;
  created?: string;
}

export interface TicketAssignmentHistoryEntry {
  teamName?: string;
  assignDate?: string;
  index?: number;
  engineerName?: string;
}

/**
 * Row from SES `loadConversationById` / `getTicketListByChatId` → `ticketList`.
 * Core fields are always normalized for the UI; richer blocks are optional when the API sends them.
 */
export interface CustomerChatTicket {
  ticketNo: string;
  ticketStatus: string;
  statusColor?: string;
  ticketRegisteredAt: string;
  ticketIndexPtr?: string | number;
  complaintType: string;
  complaintSubType: string;
  reportedBy?: string;
  priority?: string;
  priorityLevel?: string;
  nature?: string;
  domain?: string;
  briefDescription?: string;
  detailedDescription?: string;
  reportedDate?: string;
  problemOccuredDate?: string;
  location?: string;
  source?: string | null;
  emailBody?: string | null;
  actionTakenList?: Record<string, string>;
  dynamicFields?: Record<string, string>;
  followupHistory?: TicketFollowupEntry[];
  attachmentHistory?: TicketAttachmentHistoryEntry[];
  assignmentHistory?: TicketAssignmentHistoryEntry[];
  solutionHistory?: unknown[];
  agentRemarks?: unknown[];
  analysisHistory?: unknown[];
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

/** Row in transfer-to-agent list (from `getQueueNAssignedChats` `userList`). */
export type TransferAgentOption = {
  id: string;
  name: string;
  /** From array `userList` entries — green dot in transfer modal when logged in. */
  isLoggedIn?: boolean;
};

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
  /** From queue API / `NEW_CHAT_IN_QUEUE` when present (e.g. last activity time label). */
  lastChatTime?: string;
  /**
   * Unread / new-message count from `getQueueNAssignedChats` / `assignChat` (`counts`),
   * or incremented via WebSocket `NEW_MESSAGE_COUNT` when the chat is not open.
   */
  counts?: number;
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
    }
  | {
      /** SES WebSocket `NEW_MESSAGE_COUNT` — bump unread for a chat when it is not selected. */
      type: "new-message-count";
      payload: {
        chatId: string;
        domainIndex?: number;
        chatFrom?: number;
        /** When set, replaces the local count (authoritative from server). */
        counts?: number;
      };
    };

