/** Sample data for the omnichannel ops dashboard until APIs are wired. */

export const CHANNEL_COLORS = {
  whatsapp: "#22c55e",
  messenger: "#1877F2",
  instagram: "#E1306C",
  total: "#095CBC",
} as const;

export type OmnichannelChannelKey = keyof typeof CHANNEL_COLORS;

export const omnichannelChannelKpis = [
  {
    key: "whatsapp" as const,
    label: "WhatsApp",
    value: 2860,
    hint: "Total Conversations",
    changePct: 12,
    sparkline: [18, 22, 20, 28, 26, 32, 30, 36, 34, 40, 38, 44],
  },
  {
    key: "messenger" as const,
    label: "Facebook Messenger",
    value: 1240,
    hint: "Total Conversations",
    changePct: 8,
    sparkline: [12, 14, 13, 16, 15, 18, 17, 20, 19, 22, 21, 24],
  },
  {
    key: "instagram" as const,
    label: "Instagram Messenger",
    value: 980,
    hint: "Total Conversations",
    changePct: 15,
    sparkline: [8, 10, 9, 12, 11, 14, 13, 16, 15, 18, 17, 20],
  },
  {
    key: "total" as const,
    label: "Total Messages",
    value: 5080,
    hint: "Across All Channels",
    changePct: 11,
    sparkline: [38, 42, 40, 48, 46, 54, 52, 60, 58, 66, 64, 72],
  },
] as const;

export const omnichannelChannelShare = [
  { name: "WhatsApp", key: "whatsapp" as const, value: 2860, pct: 56.3 },
  { name: "Facebook Messenger", key: "messenger" as const, value: 1240, pct: 24.4 },
  { name: "Instagram Messenger", key: "instagram" as const, value: 980, pct: 19.3 },
];

export const omnichannelConversationTrend = [
  { hour: "12AM", whatsapp: 42, messenger: 18, instagram: 12 },
  { hour: "2AM", whatsapp: 28, messenger: 12, instagram: 8 },
  { hour: "4AM", whatsapp: 22, messenger: 10, instagram: 6 },
  { hour: "6AM", whatsapp: 48, messenger: 20, instagram: 14 },
  { hour: "8AM", whatsapp: 96, messenger: 42, instagram: 30 },
  { hour: "10AM", whatsapp: 140, messenger: 58, instagram: 44 },
  { hour: "12PM", whatsapp: 168, messenger: 72, instagram: 52 },
  { hour: "2PM", whatsapp: 156, messenger: 68, instagram: 48 },
  { hour: "4PM", whatsapp: 172, messenger: 74, instagram: 56 },
  { hour: "6PM", whatsapp: 148, messenger: 62, instagram: 46 },
  { hour: "8PM", whatsapp: 112, messenger: 48, instagram: 36 },
];

export const omnichannelKeyMetrics = [
  {
    label: "Average Response Time",
    value: "48 sec",
    changePct: -20,
    betterWhenDown: true,
  },
  {
    label: "Customer Satisfaction",
    value: "94%",
    changePct: 2,
    betterWhenDown: false,
  },
  {
    label: "First Contact Resolution",
    value: "87%",
    changePct: 3,
    betterWhenDown: false,
  },
  {
    label: "Agent Availability",
    value: "92%",
    changePct: 1,
    betterWhenDown: false,
  },
] as const;

export type OmnichannelConversationStatus =
  | "in_progress"
  | "resolved"
  | "in_queue";

export const omnichannelRecentConversations = [
  {
    id: "rc-1",
    customer: "Ayesha Khan",
    preview: "Need help with my order status…",
    time: "2 min ago",
    channel: "whatsapp" as const,
    status: "in_progress" as const,
  },
  {
    id: "rc-2",
    customer: "Sara Ahmed",
    preview: "Payment failed, please check",
    time: "5 min ago",
    channel: "messenger" as const,
    status: "in_queue" as const,
  },
  {
    id: "rc-3",
    customer: "Bilal Hassan",
    preview: "Thanks, issue resolved!",
    time: "12 min ago",
    channel: "instagram" as const,
    status: "resolved" as const,
  },
  {
    id: "rc-4",
    customer: "Fatima Noor",
    preview: "When will delivery arrive?",
    time: "18 min ago",
    channel: "whatsapp" as const,
    status: "in_progress" as const,
  },
  {
    id: "rc-5",
    customer: "Usman Ali",
    preview: "Refund request for invoice #4421",
    time: "24 min ago",
    channel: "messenger" as const,
    status: "in_queue" as const,
  },
];

export const omnichannelLiveActivity = [
  {
    id: "la-1",
    text: "New message from Ayesha Khan",
    channel: "whatsapp" as const,
    channelLabel: "WhatsApp",
    time: "2 min ago",
  },
  {
    id: "la-2",
    text: "Agent replied to Sara Ahmed",
    channel: "messenger" as const,
    channelLabel: "Messenger",
    time: "4 min ago",
  },
  {
    id: "la-3",
    text: "Chat resolved — Bilal Hassan",
    channel: "instagram" as const,
    channelLabel: "Instagram",
    time: "12 min ago",
  },
  {
    id: "la-4",
    text: "New chat entered queue",
    channel: "whatsapp" as const,
    channelLabel: "WhatsApp",
    time: "15 min ago",
  },
  {
    id: "la-5",
    text: "Agent claimed Fatima Noor",
    channel: "whatsapp" as const,
    channelLabel: "WhatsApp",
    time: "18 min ago",
  },
];

/** Time-period filter options (Admin Dashboards period select). */
export const omnichannelDateRanges = [
  { id: "1", label: "Today" },
  { id: "2", label: "Yesterday" },
  { id: "3", label: "Last 7 Days" },
  { id: "4", label: "Last 30 Days" },
  { id: "5", label: "Last 90 Days" },
  { id: "6", label: "Last 180 Days" },
] as const;
