export type Role = "agent" | "customer";

export type ChatStatus = "queued" | "assigned" | "resolved";

export type OnlineStatus = "online" | "away" | "offline";

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar?: string;
  email?: string;
  phone?: string;
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
}

export interface Attachment {
  id: string;
  type: "image" | "document" | "audio";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderRole: Role;
  text: string;
  createdAt: string;
  system?: boolean;
  attachments?: Attachment[];
}

export type OutgoingEvent =
  | {
      type: "login";
      payload: { user: User };
    }
  | {
      type: "customer-start-chat";
      payload: { customer: User; text: string; attachments?: Attachment[] };
    }
  | {
      type: "agent-claim-chat";
      payload: { chatId: string; agent: User };
    }
  | {
      type: "send-message";
      payload: { chatId: string; text: string; sender: User; attachments?: Attachment[] };
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
    };

