import {
  defaultApiPathForConfig,
  type SocialChannelChatConfig,
} from "@/lib/agent/socialChannelConfig";

const DEFAULT_HTTP_API_ORIGIN = "http://10.0.10.53:8080";
const DEFAULT_CHAT_WS_HOST = "10.0.10.53:8080";
const DEFAULT_CHAT_WS_PATH = "/SES/WebLiveChat";

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

function getDefaultApiOrigin(): string {
  if (typeof window === "undefined") return DEFAULT_HTTP_API_ORIGIN;
  return window.location.protocol === "https:"
    ? window.location.origin
    : DEFAULT_HTTP_API_ORIGIN;
}

function readEnv(key: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env[key]?.trim();
  return v || undefined;
}

function resolveHttpUrl(
  envKey: string,
  defaultPath: string,
): string {
  const fromEnv = readEnv(envKey);
  const base = fromEnv ?? `${getDefaultApiOrigin()}${defaultPath}`;
  return base.replace(/\/$/, "");
}

function resolveWebSocketUrl(config: SocialChannelChatConfig): string {
  const fromEnv = readEnv(config.envKeys.chatWsUrl);
  if (fromEnv) return fromEnv;

  if (typeof window === "undefined") {
    return `ws://${DEFAULT_CHAT_WS_HOST}${DEFAULT_CHAT_WS_PATH}`;
  }
  const isHttps = window.location.protocol === "https:";
  if (isHttps) {
    return `wss://${window.location.hostname}${DEFAULT_CHAT_WS_PATH}`;
  }
  return `ws://${DEFAULT_CHAT_WS_HOST}${DEFAULT_CHAT_WS_PATH}`;
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
