"use client";

import { useCallback, useEffect, useState } from "react";
import {
  postInstagramDashboard,
  type InstagramDashboardKpis,
  type InstagramWaitingChat,
} from "@/lib/dashboard/instagramDashboardApi";

export type UseInstagramDashboardKpisState = {
  data: InstagramDashboardKpis | null;
  waitingChats: InstagramWaitingChat[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

/**
 * Loads Instagram supervisor dashboard from POST `/SES/SocialMedia/instagram-inbox/dashboard`.
 * Auth uses session cookies (`credentials: "include"`).
 */
export function useInstagramDashboardKpis(
  supervisorUserId?: string,
): UseInstagramDashboardKpisState {
  const [data, setData] = useState<InstagramDashboardKpis | null>(null);
  const [waitingChats, setWaitingChats] = useState<InstagramWaitingChat[]>([]);
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
        const payload = await postInstagramDashboard(supervisorUserId);
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
