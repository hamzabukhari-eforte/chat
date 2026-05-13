"use client";

import { useCallback, useEffect, useState } from "react";
import { postWhatsappDashboardKpis } from "@/lib/dashboard/whatsappDashboardApi";
import type { WhatsappDashboardKpis } from "@/lib/dashboard/whatsappDashboardApi";

export type UseWhatsappDashboardKpisState = {
  data: WhatsappDashboardKpis | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

/**
 * Loads supervisor dashboard KPIs from POST `/SES/app/SocialMedia/whatsapp/dashboard`.
 * In development, `Userid` is sent: optional override via `supervisorUserId`, otherwise
 * `STATIC_SUPERVISOR.id` (`mahnoor.z`). Production uses session cookies only.
 */
export function useWhatsappDashboardKpis(
  supervisorUserId: string,
): UseWhatsappDashboardKpisState {
  const [data, setData] = useState<WhatsappDashboardKpis | null>(null);
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
        const kpis = await postWhatsappDashboardKpis(supervisorUserId);
        if (!cancelled) {
          setData(kpis);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setData(null);
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

  return { data, loading, error, refetch };
}
