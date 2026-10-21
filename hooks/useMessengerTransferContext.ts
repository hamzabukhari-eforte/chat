"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SES_API_FETCH_CREDENTIALS } from "@/lib/agent/sesApiOrigin";
import {
  createSocialChannelApiUrls,
  type SocialChannelApiUrls,
} from "@/lib/agent/socialChannelApiUrls";
import { getSocialChannelConfig } from "@/lib/agent/socialChannelConfig";
import {
  extractDomainAndChatFrom,
  extractTransferAgentsFromQueueResponse,
} from "@/lib/agent/parseTransferAgents";
import type { TransferAgentOption } from "@/lib/chat/types";

export type UseMessengerTransferContextState = {
  apiUrls: SocialChannelApiUrls;
  transferAgents: TransferAgentOption[];
  domainIndex: number | null;
  chatFrom: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

/**
 * Loads messenger `getQueueNAssignedChats` for transfer agents + domain/chatFrom
 * (same source as the agent inbox transfer modal).
 */
export function useMessengerTransferContext(): UseMessengerTransferContextState {
  const apiUrls = useMemo(
    () => createSocialChannelApiUrls(getSocialChannelConfig("messenger")),
    [],
  );
  const [transferAgents, setTransferAgents] = useState<TransferAgentOption[]>(
    [],
  );
  const [domainIndex, setDomainIndex] = useState<number | null>(null);
  const [chatFrom, setChatFrom] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(apiUrls.queueChats, {
          method: "POST",
          credentials: SES_API_FETCH_CREDENTIALS,
        });
        if (!res.ok) {
          throw new Error(`Queue chats failed: ${res.status}`);
        }
        const raw: unknown = await res.json();
        if (cancelled) return;
        const { domainIndex: d, chatFrom: c } = extractDomainAndChatFrom(raw);
        setTransferAgents(extractTransferAgentsFromQueueResponse(raw));
        setDomainIndex(d);
        setChatFrom(c);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setTransferAgents([]);
          setDomainIndex(null);
          setChatFrom(null);
          setError(
            e instanceof Error ? e.message : "Failed to load transfer agents",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiUrls.queueChats, tick]);

  return {
    apiUrls,
    transferAgents,
    domainIndex,
    chatFrom,
    loading,
    error,
    refetch,
  };
}
