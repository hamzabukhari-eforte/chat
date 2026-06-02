/**
 * Live agent inbox channels that share the WhatsApp UI shell but may use different HTTP + WS endpoints.
 * Backend can override URLs per channel via env vars (see `.env.example`).
 */

export type SocialChannelKey = "whatsapp" | "messenger";

export interface SocialChannelChatConfig {
  key: SocialChannelKey;
  /** Path segment under `/SES/app/SocialMedia/{segment}/`. */
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

function socialMediaPath(segment: string, endpoint: string): string {
  if (segment === "messenger") {
    return `/SES/SocialMedia/${segment}/${endpoint}`;
  }
  return `/SES/app/SocialMedia/${segment}/${endpoint}`;
}

// function socialMediaPath(segment: string, endpoint: string): string {
//   return `/SES/app/SocialMedia/${segment}/${endpoint}`;
// }

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

export function getSocialChannelConfig(
  key: SocialChannelKey,
): SocialChannelChatConfig {
  return key === "messenger"
    ? MESSENGER_SOCIAL_CHANNEL_CONFIG
    : WHATSAPP_SOCIAL_CHANNEL_CONFIG;
}

export function defaultApiPathForConfig(
  config: SocialChannelChatConfig,
  endpoint: keyof typeof WHATSAPP_ENDPOINTS,
): string {
  return socialMediaPath(config.apiSegment, WHATSAPP_ENDPOINTS[endpoint]);
}
