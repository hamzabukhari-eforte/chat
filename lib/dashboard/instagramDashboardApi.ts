/**
 * POST `/SES/SocialMedia/instagram-inbox/dashboard` — Instagram supervisor dashboard payload.
 *
 * Expected shape:
 * `{ chatStats: { activeCount, queueCount, totalChats, msgsSentCount, assignedCount,
 *   avgResolutionTime, registeredTickets, avgResponseTime }, waitingChats: [...] }`
 */

import {
  getSesApiOrigin,
  SES_API_FETCH_CREDENTIALS,
} from "@/lib/agent/sesApiOrigin";

const DEFAULT_INSTAGRAM_INBOX_DASHBOARD_PATH = "/SES/SocialMedia/instagram-inbox/dashboard";

function getInstagramDashboardUrl(): string {
  const fromEnv =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_INSTAGRAM_INBOX_DASHBOARD_URL?.trim()
      ? process.env.NEXT_PUBLIC_INSTAGRAM_INBOX_DASHBOARD_URL.trim()
      : undefined;
  return (
    fromEnv ?? `${getSesApiOrigin()}${DEFAULT_INSTAGRAM_INBOX_DASHBOARD_PATH}`
  ).replace(/\/$/, "");
}

export type InstagramDashboardKpis = {
  totalChats: number;
  chatsInQueue: number;
  /** `assignedCount` — chats currently owned by an agent. */
  chatsAssignedToAgents: number;
  /** `activeCount` when present; otherwise null. */
  activeCount: number | null;
  /** Not in instagram payload today — UI shows "—". */
  closedByAgents: number | null;
  ticketsRegisteredLast24Hours: number;
  messagesSent: number;
  /** Minutes; null when API returns null. */
  avgResponseTimeMinutes: number | null;
  /** Minutes; null when API returns null. */
  avgResolutionTimeMinutes: number | null;
};

export type InstagramWaitingChat = {
  conversationId: number;
  assignedTo: string;
  customer: string;
  /** Display string from API, e.g. `"1601h 21m 38s"`, or null. */
  customerWaitingTime: string | null;
};

export type InstagramDashboardPayload = {
  kpis: InstagramDashboardKpis;
  waitingChats: InstagramWaitingChat[];
};

function coerceInt(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.trunc(raw);
  if (typeof raw === "string") {
    const n = Number(raw.trim());
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return null;
}

function coerceFloat(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function unwrapRecord(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const root = json as Record<string, unknown>;
  const data = root.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  const result = root.result;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return result as Record<string, unknown>;
  }
  return root;
}

function chatStatsSource(obj: Record<string, unknown>): Record<string, unknown> | null {
  for (const key of ["chatStats", "ChatStats", "stats", "Stats"] as const) {
    const stats = obj[key];
    if (stats && typeof stats === "object" && !Array.isArray(stats)) {
      return stats as Record<string, unknown>;
    }
  }
  return null;
}

function parseWaitingChats(raw: unknown): InstagramWaitingChat[] {
  if (!Array.isArray(raw)) return [];
  const out: InstagramWaitingChat[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const conversationId = coerceInt(
      row.conversationId ?? row.ConversationId ?? row.chatId ?? row.ChatId,
    );
    if (conversationId === null) continue;
    const customer =
      typeof row.customer === "string"
        ? row.customer
        : typeof row.Customer === "string"
          ? row.Customer
          : "";
    const assignedTo =
      typeof row.assignedTo === "string"
        ? row.assignedTo
        : typeof row.AssignedTo === "string"
          ? row.AssignedTo
          : typeof row.agentName === "string"
            ? row.agentName
            : "";
    const waitRaw = row.customerWaitingTime ?? row.CustomerWaitingTime;
    const customerWaitingTime =
      typeof waitRaw === "string" && waitRaw.trim()
        ? waitRaw.trim()
        : null;
    out.push({ conversationId, assignedTo, customer, customerWaitingTime });
  }
  return out;
}

/**
 * Maps Instagram dashboard JSON into KPIs + waiting chats.
 */
export function parseInstagramDashboard(
  json: unknown,
): InstagramDashboardPayload | null {
  const obj = unwrapRecord(json);
  if (!obj) return null;
  const src = chatStatsSource(obj);
  if (!src) return null;

  const totalChats = coerceInt(src.totalChats ?? src.TotalChats);
  const chatsInQueue = coerceInt(src.queueCount ?? src.QueueCount);
  const chatsAssignedToAgents = coerceInt(
    src.assignedCount ?? src.AssignedCount,
  );
  const ticketsRegisteredLast24Hours = coerceInt(
    src.registeredTickets ?? src.RegisteredTickets,
  );
  const messagesSent = coerceInt(src.msgsSentCount ?? src.MsgsSentCount);

  if (
    totalChats === null ||
    chatsInQueue === null ||
    chatsAssignedToAgents === null ||
    ticketsRegisteredLast24Hours === null ||
    messagesSent === null
  ) {
    return null;
  }

  const activeCount = coerceInt(src.activeCount ?? src.ActiveCount);
  const closedByAgents = coerceInt(
    src.closedCount ?? src.ClosedCount ?? src.closedByAgents,
  );

  const avgResponseTimeMinutes = coerceFloat(
    src.avgResponseTime ?? src.AvgResponseTime,
  );
  const avgResolutionTimeMinutes = coerceFloat(
    src.avgResolutionTime ?? src.AvgResolutionTime,
  );

  const waitingChats = parseWaitingChats(
    obj.waitingChats ?? obj.WaitingChats,
  );

  return {
    kpis: {
      totalChats,
      chatsInQueue,
      chatsAssignedToAgents,
      activeCount,
      closedByAgents,
      ticketsRegisteredLast24Hours,
      messagesSent,
      avgResponseTimeMinutes,
      avgResolutionTimeMinutes,
    },
    waitingChats,
  };
}

/** @deprecated Prefer `parseInstagramDashboard`. */
export function parseInstagramDashboardKpis(
  json: unknown,
): InstagramDashboardKpis | null {
  return parseInstagramDashboard(json)?.kpis ?? null;
}

/**
 * POST Instagram dashboard. Auth via session cookies (`credentials: "include"`).
 */
export async function postInstagramDashboard(
  _supervisorUserId?: string,
  body: Record<string, unknown> = {},
): Promise<InstagramDashboardPayload> {
  const url = new URL(getInstagramDashboardUrl());

  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: SES_API_FETCH_CREDENTIALS,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`instagram dashboard failed: HTTP ${res.status}`);
  }

  const json: unknown = await res.json();
  if (typeof console !== "undefined") {
    console.log("[instagram-dashboard] POST /dashboard response", json);
  }

  const parsed = parseInstagramDashboard(json);
  if (!parsed) {
    throw new Error("instagram dashboard: unrecognized payload shape");
  }
  return parsed;
}

/** @deprecated Prefer `postInstagramDashboard`. */
export async function postInstagramDashboardKpis(
  supervisorUserId?: string,
  body: Record<string, unknown> = {},
): Promise<InstagramDashboardKpis> {
  const payload = await postInstagramDashboard(supervisorUserId, body);
  return payload.kpis;
}
