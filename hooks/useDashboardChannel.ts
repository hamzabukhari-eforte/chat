"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChannelId } from "@/components/sections/ChannelDrawerSection";
import {
  channelFromSearchParams,
  stripChannelSearchParams,
  urlWithChannel,
} from "@/lib/agent/dashboardChannelUrl";

function readChannelFromWindow(): ChannelId {
  if (typeof window === "undefined") return "whatsapp";
  return channelFromSearchParams(new URLSearchParams(window.location.search));
}

/**
 * Syncs the active dashboard channel with the browser URL query only.
 * Uses `history.replaceState` so embedded SES routes are not rewritten by Next `basePath`.
 */
export function useDashboardChannel(): [ChannelId, (channel: ChannelId) => void] {
  const [activeChannel, setActiveChannel] = useState<ChannelId>("whatsapp");

  useEffect(() => {
    setActiveChannel(readChannelFromWindow());

    const onPopState = () => setActiveChannel(readChannelFromWindow());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setChannel = useCallback((channel: ChannelId) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    stripChannelSearchParams(url.searchParams);
    const nextHref = urlWithChannel(
      url.pathname,
      channel,
      url.hash,
    );
    window.history.replaceState(null, "", nextHref);
    setActiveChannel(channel);
  }, []);

  return [activeChannel, setChannel];
}
