export type Role = "agent" | "customer";

export type ChatStatus = "queued" | "assigned" | "resolved";

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Chat {
  id: string;
  customer: User;
  agent?: User;
  status: ChatStatus;
  lastMessage?: Message;
  createdAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderRole: Role;
  text: string;
  createdAt: string;
  system?: boolean;
}

export type OutgoingEvent =
  | {
      type: "login";
      payload: { user: User };
    }
  | {
      type: "customer-start-chat";
      payload: { customer: User; text: string };
    }
  | {
      type: "agent-claim-chat";
      payload: { chatId: string; agent: User };
    }
  | {
      type: "send-message";
      payload: { chatId: string; text: string; sender: User };
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

