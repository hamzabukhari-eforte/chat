/**
 * POST `/SES/app/SocialMedia/whatsapp/dashboard` — supervisor KPI payload.
 * Mirrors other SES WhatsApp HTTP helpers (`createTicketReviewByChatId`, queue fetch).
 */

import { STATIC_SUPERVISOR } from "@/lib/supervisor/staticSupervisor";

const DEFAULT_HTTP_API_ORIGIN = "http://10.0.10.53:8080";
const DEFAULT_WHATSAPP_DASHBOARD_PATH = "/SES/app/SocialMedia/whatsapp/dashboard";

function getDefaultApiOrigin(): string {
  if (typeof window === "undefined") return DEFAULT_HTTP_API_ORIGIN;
  return window.location.protocol === "https:"
    ? window.location.origin
    : DEFAULT_HTTP_API_ORIGIN;
}

function getWhatsappDashboardUrl(): string {
  const fromEnv =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_WHATSAPP_DASHBOARD_URL?.trim()
      ? process.env.NEXT_PUBLIC_WHATSAPP_DASHBOARD_URL.trim()
      : undefined;
  return (
    fromEnv ?? `${getDefaultApiOrigin()}${DEFAULT_WHATSAPP_DASHBOARD_PATH}`
  ).replace(/\/$/, "");
}

function shouldSendUserIdInParams(): boolean {
  return (
    typeof process !== "undefined" && process.env.NODE_ENV === "development"
  );
}

function getApiFetchCredentials(): RequestCredentials {
  return shouldSendUserIdInParams() ? "omit" : "include";
}

export type WhatsappDashboardKpis = {
  totalChats: number;
  chatsInQueue: number;
  chatsAssignedToAgents: number;
  closedByAgents: number;
  ticketsRegisteredLast24Hours: number;
  avgWaitMinutes: number;
  messagesSent: number;
  /** Mean first-response latency in minutes (0 if not reported). */
  avgResponseTimeMinutes: number;
  /** Mean time to resolve/close in minutes (0 if not reported). */
  avgResolutionTimeMinutes: number;
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
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickInt(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    const n = coerceInt(obj[k]);
    if (n !== null) return n;
  }
  return null;
}

function pickFloat(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    const n = coerceFloat(obj[k]);
    if (n !== null) return n;
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

/** SES dashboard body: `{ stats: { queueCount, totalChats, ... } }` (values may be string or number). */
function kpiStatsSource(obj: Record<string, unknown>): Record<string, unknown> {
  const stats = obj.stats;
  if (stats && typeof stats === "object" && !Array.isArray(stats)) {
    return stats as Record<string, unknown>;
  }
  return obj;
}

/**
 * Maps WhatsApp dashboard JSON into KPIs. Primary shape:
 * `{ stats: { queueCount, totalChats, assignedCount, registeredTickets, closedCount,
 * msgsSentCount, avgResponseTime, avgResolutionTime, ... } }`
 * (plus `data` / `result` wrappers). `avgWaitMinutes` and message/time KPIs default to `0` when omitted.
 */
export function parseWhatsappDashboardKpis(json: unknown): WhatsappDashboardKpis | null {
  const obj = unwrapRecord(json);
  if (!obj) return null;
  const src = kpiStatsSource(obj);

  const totalChats = pickInt(src, [
    "totalChats",
    "TotalChats",
    "totalChatCount",
    "TotalChatCount",
    "total_chats",
    "allChats",
    "AllChats",
  ]);
  const chatsInQueue = pickInt(src, [
    "chatsInQueue",
    "ChatsInQueue",
    "queueCount",
    "QueueCount",
    "inQueue",
    "InQueue",
    "queuedChats",
    "QueuedChats",
  ]);
  const chatsAssignedToAgents = pickInt(src, [
    "chatsAssignedToAgents",
    "ChatsAssignedToAgents",
    "assignedCount",
    "AssignedCount",
    "assignedChats",
    "AssignedChats",
    "assignedChatCount",
    "AssignedChatCount",
  ]);
  const closedByAgents = pickInt(src, [
    "closedByAgents",
    "ClosedByAgents",
    "closedCount",
    "ClosedCount",
    "closedChats",
    "ClosedChats",
    "chatsClosedByAgents",
    "ChatsClosedByAgents",
  ]);
  const ticketsRegisteredLast24Hours = pickInt(src, [
    "registeredTickets",
    "RegisteredTickets",
    "ticketsRegisteredLast24Hours",
    "TicketsRegisteredLast24Hours",
    "ticketsLast24Hours",
    "TicketsLast24Hours",
    "ticketCount24h",
    "TicketCount24h",
    "ticketsRegistered24h",
    "TicketsRegistered24h",
  ]);
  const avgWaitKeys = [
    "avgWaitMinutes",
    "AvgWaitMinutes",
    "averageWaitMinutes",
    "AverageWaitMinutes",
    "avg_wait_minutes",
    "avgWaitMins",
    "AvgWaitMins",
  ] as const;
  const avgWaitMinutes =
    pickFloat(src, [...avgWaitKeys]) ??
    pickInt(src, [...avgWaitKeys]) ??
    pickFloat(obj, [...avgWaitKeys]) ??
    pickInt(obj, [...avgWaitKeys]) ??
    0;

  if (
    totalChats === null ||
    chatsInQueue === null ||
    chatsAssignedToAgents === null ||
    closedByAgents === null ||
    ticketsRegisteredLast24Hours === null
  ) {
    return null;
  }

  const messagesSent =
    pickInt(src, [
      "msgsSentCount",
      "MsgsSentCount",
      "messagesSent",
      "MessagesSent",
      "messageCount",
      "MessageCount",
      "messages_count",
      "totalMessagesSent",
      "TotalMessagesSent",
    ]) ?? 0;

  const avgResponseTimeMinutes =
    pickFloat(src, [
      "avgResponseTime",
      "AvgResponseTime",
      "avgResponseTimeMinutes",
      "AvgResponseTimeMinutes",
      "averageResponseTimeMinutes",
      "AverageResponseTimeMinutes",
    ]) ??
    pickInt(src, [
      "avgResponseTime",
      "AvgResponseTime",
      "avgResponseTimeMinutes",
      "AvgResponseTimeMinutes",
    ]) ??
    0;

  const avgResolutionTimeMinutes =
    pickFloat(src, [
      "avgResolutionTime",
      "AvgResolutionTime",
      "avgResolutionTimeMinutes",
      "AvgResolutionTimeMinutes",
      "averageResolutionTimeMinutes",
      "AverageResolutionTimeMinutes",
    ]) ??
    pickInt(src, [
      "avgResolutionTime",
      "AvgResolutionTime",
      "avgResolutionTimeMinutes",
      "AvgResolutionTimeMinutes",
    ]) ??
    0;

  return {
    totalChats,
    chatsInQueue,
    chatsAssignedToAgents,
    closedByAgents,
    ticketsRegisteredLast24Hours,
    avgWaitMinutes,
    messagesSent,
    avgResponseTimeMinutes,
    avgResolutionTimeMinutes,
  };
}

/**
 * POST dashboard KPIs. In development, always sends `Userid`: `supervisorUserId` if set,
 * otherwise {@link STATIC_SUPERVISOR.id}.
 */
export async function postWhatsappDashboardKpis(
  supervisorUserId: string,
  body: Record<string, unknown> = {},
): Promise<WhatsappDashboardKpis> {
  const url = new URL(getWhatsappDashboardUrl());
  if (shouldSendUserIdInParams()) {
    const userId =
      supervisorUserId.trim() || STATIC_SUPERVISOR.id;
    url.searchParams.set("Userid", userId);
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: getApiFetchCredentials(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`whatsapp dashboard failed: HTTP ${res.status}`);
  }

  const json: unknown = await res.json();
  const parsed = parseWhatsappDashboardKpis(json);
  if (!parsed) {
    throw new Error("whatsapp dashboard: unrecognized KPI payload shape");
  }
  return parsed;
}
