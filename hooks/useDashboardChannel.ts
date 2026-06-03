"use client";

import { useCallback, useSyncExternalStore } from "react";
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

const channelListeners = new Set<() => void>();

function subscribeDashboardChannel(onStoreChange: () => void): () => void {
  channelListeners.add(onStoreChange);
  const onPopState = () => onStoreChange();
  window.addEventListener("popstate", onPopState);
  return () => {
    channelListeners.delete(onStoreChange);
    window.removeEventListener("popstate", onPopState);
  };
}

function notifyDashboardChannelChange(): void {
  channelListeners.forEach((listener) => listener());
}

function getDashboardChannelSnapshot(): ChannelId {
  return readChannelFromWindow();
}

function getDashboardChannelServerSnapshot(): ChannelId {
  return "whatsapp";
}

/**
 * Syncs the active dashboard channel with the browser URL query only.
 * Uses `history.replaceState` so embedded SES routes are not rewritten by Next `basePath`.
 */
export function useDashboardChannel(): [ChannelId, (channel: ChannelId) => void] {
  const activeChannel = useSyncExternalStore(
    subscribeDashboardChannel,
    getDashboardChannelSnapshot,
    getDashboardChannelServerSnapshot,
  );

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
    notifyDashboardChannelChange();
  }, []);

  return [activeChannel, setChannel];
}
