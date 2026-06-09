"use client";

import type { ChannelId } from "@/components/sections/ChannelDrawerSection";
import {
  getSocialChannelConfig,
  type SocialChannelKey,
} from "@/lib/agent/socialChannelConfig";
import type { User } from "@/lib/chat/types";
import { useWebSocketChat } from "./useWebSocketChat";

export function isLiveAgentInboxChannel(
  channel: ChannelId,
): channel is SocialChannelKey {
  return (
    channel === "whatsapp" ||
    channel === "messenger" ||
    channel === "instagram-inbox"
  );
}

/** Agent inbox data layer (same UI, channel-specific APIs / WS). */
export function useAgentChannelChat(
  channel: ChannelId,
  currentUser: User | null,
) {
  const socialKey: SocialChannelKey = isLiveAgentInboxChannel(channel)
    ? channel
    : "whatsapp";
  const channelConfig = getSocialChannelConfig(socialKey);
  return useWebSocketChat(currentUser, channelConfig);
}
