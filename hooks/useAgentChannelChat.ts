"use client";

import type { ChannelId } from "@/components/sections/ChannelDrawerSection";
import {
  getSocialChannelConfig,
  type SocialChannelKey,
} from "@/lib/agent/socialChannelConfig";
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
export function useAgentChannelChat(channel: ChannelId) {
  const socialKey: SocialChannelKey = isLiveAgentInboxChannel(channel)
    ? channel
    : "whatsapp";
  const channelConfig = getSocialChannelConfig(socialKey);
  return useWebSocketChat(null, channelConfig);
}
