"use client";

import { useCallback, useEffect, useState } from "react";
import {
  postMessengerDashboard,
  type MessengerDashboardKpis,
  type MessengerWaitingChat,
} from "@/lib/dashboard/messengerDashboardApi";

export type UseMessengerDashboardKpisState = {
  data: MessengerDashboardKpis | null;
  waitingChats: MessengerWaitingChat[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

/**
 * Loads Messenger supervisor dashboard from POST `/SES/SocialMedia/messenger/dashboard`.
 * Auth uses session cookies (`credentials: "include"`).
 */
export function useMessengerDashboardKpis(
  supervisorUserId?: string,
): UseMessengerDashboardKpisState {
  const [data, setData] = useState<MessengerDashboardKpis | null>(null);
  const [waitingChats, setWaitingChats] = useState<MessengerWaitingChat[]>([]);
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
        const payload = await postMessengerDashboard(supervisorUserId);
        if (!cancelled) {
          setData(payload.kpis);
          setWaitingChats(payload.waitingChats);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setWaitingChats([]);
          setError(e instanceof Error ? e.message : "Dashboard request failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supervisorUserId, tick]);

  return { data, waitingChats, loading, error, refetch };
}
