/**
 * Live agent inbox channels that share the WhatsApp UI shell but may use different HTTP + WS endpoints.
 * Backend can override URLs per channel via env vars (see `.env.example`).
 */

export type SocialChannelKey = "whatsapp" | "messenger" | "instagram-inbox";

export interface SocialChannelChatConfig {
  key: SocialChannelKey;
  /** Path segment under `/SES/.../SocialMedia/{segment}/` (see `socialMediaPath`). */
  apiSegment: SocialChannelKey;
  /**
   * Optional `process.env` keys for full URL overrides (production / per-gateway).
   * When unset, defaults mirror WhatsApp paths with `apiSegment` substituted.
   */
  envKeys: {
    queueChatsUrl: string;
    loadConversationUrl: string;
    assignChatUrl: string;
    transferChatUrl: string;
    closeChatUrl: string;
    ticketListByChatIdUrl: string;
    autoAssignmentStatusUrl: string;
    createTicketReviewByChatIdUrl: string;
    chatWsUrl: string;
  };
}

/** Non-WhatsApp live inboxes use `/SES/SocialMedia/...` (no `app/` segment) until backend finalizes paths. */
const SOCIAL_MEDIA_PATH_WITHOUT_APP = new Set<SocialChannelKey>([
  "messenger",
  "instagram-inbox",
]);

function socialMediaPath(segment: string, endpoint: string): string {
  if (SOCIAL_MEDIA_PATH_WITHOUT_APP.has(segment as SocialChannelKey)) {
    return `/SES/SocialMedia/${segment}/${endpoint}`;
  }
  return `/SES/app/SocialMedia/${segment}/${endpoint}`;
}

const WHATSAPP_ENDPOINTS = {
  queueChats: "getQueueNAssignedChats",
  loadConversation: "loadConversationById",
  assignChat: "assignChat",
  transferChat: "transferChat",
  closeChat: "closeChat",
  ticketListByChatId: "getTicketListByChatId",
  autoAssignmentStatus: "getAutoAssignmentStatus",
  createTicketReviewByChatId: "createTicketReviewByChatId",
} as const;

function buildConfig(
  key: SocialChannelKey,
  envKeys: SocialChannelChatConfig["envKeys"],
): SocialChannelChatConfig {
  return { key, apiSegment: key, envKeys };
}

export const WHATSAPP_SOCIAL_CHANNEL_CONFIG: SocialChannelChatConfig = buildConfig(
  "whatsapp",
  {
    queueChatsUrl: "NEXT_PUBLIC_QUEUE_CHATS_URL",
    loadConversationUrl: "NEXT_PUBLIC_LOAD_CONVERSATION_URL",
    assignChatUrl: "NEXT_PUBLIC_ASSIGN_CHAT_URL",
    transferChatUrl: "NEXT_PUBLIC_TRANSFER_CHAT_URL",
    closeChatUrl: "NEXT_PUBLIC_CLOSE_CHAT_URL",
    ticketListByChatIdUrl: "NEXT_PUBLIC_GET_TICKET_LIST_BY_CHAT_ID_URL",
    autoAssignmentStatusUrl: "NEXT_PUBLIC_AUTO_ASSIGNMENT_STATUS_URL",
    createTicketReviewByChatIdUrl:
      "NEXT_PUBLIC_CREATE_TICKET_REVIEW_BY_CHAT_ID_URL",
    chatWsUrl: "NEXT_PUBLIC_CHAT_WS_URL",
  },
);

export const MESSENGER_SOCIAL_CHANNEL_CONFIG: SocialChannelChatConfig = buildConfig(
  "messenger",
  {
    queueChatsUrl: "NEXT_PUBLIC_MESSENGER_QUEUE_CHATS_URL",
    loadConversationUrl: "NEXT_PUBLIC_MESSENGER_LOAD_CONVERSATION_URL",
    assignChatUrl: "NEXT_PUBLIC_MESSENGER_ASSIGN_CHAT_URL",
    transferChatUrl: "NEXT_PUBLIC_MESSENGER_TRANSFER_CHAT_URL",
    closeChatUrl: "NEXT_PUBLIC_MESSENGER_CLOSE_CHAT_URL",
    ticketListByChatIdUrl: "NEXT_PUBLIC_MESSENGER_GET_TICKET_LIST_BY_CHAT_ID_URL",
    autoAssignmentStatusUrl: "NEXT_PUBLIC_MESSENGER_AUTO_ASSIGNMENT_STATUS_URL",
    createTicketReviewByChatIdUrl:
      "NEXT_PUBLIC_MESSENGER_CREATE_TICKET_REVIEW_BY_CHAT_ID_URL",
    chatWsUrl: "NEXT_PUBLIC_MESSENGER_CHAT_WS_URL",
  },
);

export const INSTAGRAM_INBOX_SOCIAL_CHANNEL_CONFIG: SocialChannelChatConfig =
  buildConfig("instagram-inbox", {
    queueChatsUrl: "NEXT_PUBLIC_INSTAGRAM_INBOX_QUEUE_CHATS_URL",
    loadConversationUrl: "NEXT_PUBLIC_INSTAGRAM_INBOX_LOAD_CONVERSATION_URL",
    assignChatUrl: "NEXT_PUBLIC_INSTAGRAM_INBOX_ASSIGN_CHAT_URL",
    transferChatUrl: "NEXT_PUBLIC_INSTAGRAM_INBOX_TRANSFER_CHAT_URL",
    closeChatUrl: "NEXT_PUBLIC_INSTAGRAM_INBOX_CLOSE_CHAT_URL",
    ticketListByChatIdUrl:
      "NEXT_PUBLIC_INSTAGRAM_INBOX_GET_TICKET_LIST_BY_CHAT_ID_URL",
    autoAssignmentStatusUrl:
      "NEXT_PUBLIC_INSTAGRAM_INBOX_AUTO_ASSIGNMENT_STATUS_URL",
    createTicketReviewByChatIdUrl:
      "NEXT_PUBLIC_INSTAGRAM_INBOX_CREATE_TICKET_REVIEW_BY_CHAT_ID_URL",
    chatWsUrl: "NEXT_PUBLIC_INSTAGRAM_INBOX_CHAT_WS_URL",
  });

export function getSocialChannelConfig(
  key: SocialChannelKey,
): SocialChannelChatConfig {
  switch (key) {
    case "messenger":
      return MESSENGER_SOCIAL_CHANNEL_CONFIG;
    case "instagram-inbox":
      return INSTAGRAM_INBOX_SOCIAL_CHANNEL_CONFIG;
    default:
      return WHATSAPP_SOCIAL_CHANNEL_CONFIG;
  }
}

export function defaultApiPathForConfig(
  config: SocialChannelChatConfig,
  endpoint: keyof typeof WHATSAPP_ENDPOINTS,
): string {
  return socialMediaPath(config.apiSegment, WHATSAPP_ENDPOINTS[endpoint]);
}
