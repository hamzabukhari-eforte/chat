/** MVP placeholder metrics until APIs are wired. */

export const dashboardSummary = {
  totalChats: 1842,
  chatsInQueue: 47,
  chatsAssignedToAgents: 128,
  closedByAgents: 93,
  ticketsRegisteredLast24Hours: 27,
  avgWaitMinutes: 6.4,
} as const;

/** Hourly buckets `00`–`23` for a rolling 24h window (MVP sample until API exists). */
const VOLUME_24H_TOTALS = [
  14, 9, 7, 6, 5, 8, 16, 28, 36, 42, 39, 41, 45, 43, 38, 35, 37, 44, 40, 32, 26, 22, 18, 16,
] as const;

export const volumeLast24Hours = VOLUME_24H_TOTALS.map((total, i) => ({
  hour: `${String(i).padStart(2, "0")}`,
  total,
  queued: Math.max(0, Math.round(total * 0.1 + (i % 4))),
  assigned: Math.max(0, Math.round(total * 0.58)),
}));

export const chatsPerDay = [
  { day: "Mon", total: 210, queued: 18, assigned: 142 },
  { day: "Tue", total: 245, queued: 22, assigned: 156 },
  { day: "Wed", total: 198, queued: 15, assigned: 131 },
  { day: "Thu", total: 267, queued: 28, assigned: 168 },
  { day: "Fri", total: 289, queued: 31, assigned: 175 },
  { day: "Sat", total: 142, queued: 12, assigned: 88 },
  { day: "Sun", total: 118, queued: 9, assigned: 72 },
] as const;

export const chatsByAgent = [
  { agent: "Mahnoor", assigned: 34, resolved: 28 },
  { agent: "Ali", assigned: 29, resolved: 25 },
  { agent: "Sara", assigned: 31, resolved: 27 },
  { agent: "Omar", assigned: 22, resolved: 19 },
  { agent: "Unassigned", assigned: 12, resolved: 0 },
] as const;

export type QueueChatRow = {
  id: string;
  customer: string;
  channel: string;
  waitingMinutes: number;
};

export const dummyQueueChats: QueueChatRow[] = [
  { id: "q-1001", customer: "Ayesha Khan", channel: "Web", waitingMinutes: 4 },
  { id: "q-1002", customer: "Hassan R.", channel: "WhatsApp", waitingMinutes: 12 },
  { id: "q-1003", customer: "Noor LLC", channel: "Web", waitingMinutes: 2 },
  { id: "q-1004", customer: "Fahad", channel: "WhatsApp", waitingMinutes: 21 },
  { id: "q-1005", customer: "Zara M.", channel: "Web", waitingMinutes: 7 },
];

export type AssignedChatRow = {
  id: string;
  customer: string;
  agent: string;
  channel: string;
  status: "active" | "pending";
};

export const dummyAssignedChats: AssignedChatRow[] = [
  {
    id: "a-501",
    customer: "Imran Qureshi",
    agent: "Mahnoor",
    channel: "WhatsApp",
    status: "active",
  },
  {
    id: "a-502",
    customer: "Blue Dune Co.",
    agent: "Ali",
    channel: "Web",
    status: "active",
  },
  {
    id: "a-503",
    customer: "Layla H.",
    agent: "Sara",
    channel: "Web",
    status: "pending",
  },
  {
    id: "a-504",
    customer: "Kamran Siddiqui",
    agent: "Omar",
    channel: "WhatsApp",
    status: "active",
  },
];
