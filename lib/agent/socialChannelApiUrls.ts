import {
  defaultApiPathForConfig,
  type SocialChannelChatConfig,
} from "@/lib/agent/socialChannelConfig";
import {
  getSesApiOrigin,
  getSesWebSocketUrl,
} from "@/lib/agent/sesApiOrigin";

export interface SocialChannelApiUrls {
  queueChats: string;
  loadConversation: string;
  assignChat: string;
  transferChat: string;
  closeChat: string;
  ticketListByChatId: string;
  autoAssignmentStatus: string;
  createTicketReviewByChatId: string;
  webSocket: string;
}

function readEnv(key: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env[key]?.trim();
  return v || undefined;
}

function resolveHttpUrl(envKey: string, defaultPath: string): string {
  const fromEnv = readEnv(envKey);
  const base = fromEnv ?? `${getSesApiOrigin()}${defaultPath}`;
  return base.replace(/\/$/, "");
}

function resolveWebSocketUrl(config: SocialChannelChatConfig): string {
  const fromEnv = readEnv(config.envKeys.chatWsUrl);
  if (fromEnv) return fromEnv;
  return getSesWebSocketUrl();
}

export function createSocialChannelApiUrls(
  config: SocialChannelChatConfig,
): SocialChannelApiUrls {
  return {
    queueChats: resolveHttpUrl(
      config.envKeys.queueChatsUrl,
      defaultApiPathForConfig(config, "queueChats"),
    ),
    loadConversation: resolveHttpUrl(
      config.envKeys.loadConversationUrl,
      defaultApiPathForConfig(config, "loadConversation"),
    ),
    assignChat: resolveHttpUrl(
      config.envKeys.assignChatUrl,
      defaultApiPathForConfig(config, "assignChat"),
    ),
    transferChat: resolveHttpUrl(
      config.envKeys.transferChatUrl,
      defaultApiPathForConfig(config, "transferChat"),
    ),
    closeChat: resolveHttpUrl(
      config.envKeys.closeChatUrl,
      defaultApiPathForConfig(config, "closeChat"),
    ),
    ticketListByChatId: resolveHttpUrl(
      config.envKeys.ticketListByChatIdUrl,
      defaultApiPathForConfig(config, "ticketListByChatId"),
    ),
    autoAssignmentStatus: resolveHttpUrl(
      config.envKeys.autoAssignmentStatusUrl,
      defaultApiPathForConfig(config, "autoAssignmentStatus"),
    ),
    createTicketReviewByChatId: resolveHttpUrl(
      config.envKeys.createTicketReviewByChatIdUrl,
      defaultApiPathForConfig(config, "createTicketReviewByChatId"),
    ),
    webSocket: resolveWebSocketUrl(config),
  };
}
