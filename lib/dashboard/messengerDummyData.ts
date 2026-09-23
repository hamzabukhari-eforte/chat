/** Messenger inbox monitor — sample data until APIs are wired. */

/** Same KPI names / shape as the WhatsApp ops dashboard (dummy values). */
export const messengerDashboardKpis = {
  totalChats: 124,
  totalChatsHint: "Last 12 hours",
  chatsInQueue: 4,
  chatsInQueueHint: "Avg wait ~6.4 min",
  chatsAssignedToAgents: 9,
  chatsAssignedToAgentsHint: "Active ownership",
  closedByAgents: 98,
  closedByAgentsHint: "Chats closed while owned by an agent",
  ticketsRegisteredLast24Hours: 27,
  ticketsRegisteredHint: "Last 12 hours",
  messagesSent: 412,
  messagesSentHint: "Outbound agent & system messages",
  avgResponseTimeMinutes: 3 + 12 / 60,
  avgResponseTimeHint: "First meaningful reply (minutes)",
  avgResolutionTimeMinutes: 18 + 24 / 60,
  avgResolutionTimeHint: "Open to closed (minutes)",
} as const;

/** Hourly volume + response times (full day, 12 AM → 11 PM). */
export const messengerChatsThroughDay = [
  { hour: "12 AM", volume: 4, firstReplyMin: 3.2, avgReplyMin: 2.8 },
  { hour: "1 AM", volume: 2, firstReplyMin: 4.1, avgReplyMin: 3.5 },
  { hour: "2 AM", volume: 1, firstReplyMin: 5.4, avgReplyMin: 4.2 },
  { hour: "3 AM", volume: 2, firstReplyMin: 6.8, avgReplyMin: 5.1 },
  { hour: "4 AM", volume: 3, firstReplyMin: 4.9, avgReplyMin: 3.9 },
  { hour: "5 AM", volume: 5, firstReplyMin: 3.6, avgReplyMin: 2.9 },
  { hour: "6 AM", volume: 8, firstReplyMin: 2.8, avgReplyMin: 2.4 },
  { hour: "7 AM", volume: 12, firstReplyMin: 3.1, avgReplyMin: 2.6 },
  { hour: "8 AM", volume: 16, firstReplyMin: 4.5, avgReplyMin: 3.4 },
  { hour: "9 AM", volume: 18, firstReplyMin: 5.2, avgReplyMin: 3.8 },
  { hour: "10 AM", volume: 15, firstReplyMin: 3.9, avgReplyMin: 3.1 },
  { hour: "11 AM", volume: 14, firstReplyMin: 4.2, avgReplyMin: 3.3 },
  { hour: "12 PM", volume: 17, firstReplyMin: 4.8, avgReplyMin: 3.6 },
  { hour: "1 PM", volume: 19, firstReplyMin: 5.1, avgReplyMin: 3.9 },
  { hour: "2 PM", volume: 16, firstReplyMin: 4.4, avgReplyMin: 3.5 },
  { hour: "3 PM", volume: 15, firstReplyMin: 3.7, avgReplyMin: 3.0 },
  { hour: "4 PM", volume: 18, firstReplyMin: 4.0, avgReplyMin: 3.2 },
  { hour: "5 PM", volume: 20, firstReplyMin: 4.6, avgReplyMin: 3.7 },
  { hour: "6 PM", volume: 14, firstReplyMin: 3.8, avgReplyMin: 3.1 },
  { hour: "7 PM", volume: 11, firstReplyMin: 3.3, avgReplyMin: 2.7 },
  { hour: "8 PM", volume: 9, firstReplyMin: 2.9, avgReplyMin: 2.5 },
  { hour: "9 PM", volume: 7, firstReplyMin: 3.5, avgReplyMin: 2.8 },
  { hour: "10 PM", volume: 5, firstReplyMin: 4.3, avgReplyMin: 3.4 },
  { hour: "11 PM", volume: 3, firstReplyMin: 5.0, avgReplyMin: 4.0 },
] as const;

export const MESSENGER_TIME_LIMIT_MINUTES = 5;

export type MessengerLiveQueueStatus = "new" | "pending" | "unanswered";

export type MessengerLiveQueueItem = {
  id: string;
  customer: string;
  lastMessage: string;
  waitSeconds: number;
  agentName: string | null;
  status: MessengerLiveQueueStatus;
};

export const messengerLiveQueue: MessengerLiveQueueItem[] = [
  {
    id: "lq-1",
    customer: "Maryam Qureshi",
    lastMessage: "Payment kar di hai, confirm kar dein",
    waitSeconds: 54 * 60 + 33,
    agentName: "Danish",
    status: "unanswered",
  },
  {
    id: "lq-2",
    customer: "Laiba Rauf",
    lastMessage: "Kab tak delivery hogi order ki?",
    waitSeconds: 46 * 60 + 42,
    agentName: "Danish",
    status: "unanswered",
  },
  {
    id: "lq-3",
    customer: "Hamza Sheikh",
    lastMessage: "Order status check karna tha",
    waitSeconds: 30 * 60 + 18,
    agentName: "Usman",
    status: "unanswered",
  },
  {
    id: "lq-4",
    customer: "Sana Iqbal",
    lastMessage: "Refund kab process hoga?",
    waitSeconds: 18 * 60 + 5,
    agentName: null,
    status: "unanswered",
  },
  {
    id: "lq-5",
    customer: "Bilal Ahmed",
    lastMessage: "Invoice resend kar dein please",
    waitSeconds: 12 * 60 + 40,
    agentName: "Usman",
    status: "unanswered",
  },
  {
    id: "lq-6",
    customer: "Ayesha Noor",
    lastMessage: "Tracking number share kar dein",
    waitSeconds: 4 * 60 + 12,
    agentName: null,
    status: "new",
  },
  {
    id: "lq-7",
    customer: "Omar Farooq",
    lastMessage: "Size exchange possible hai?",
    waitSeconds: 2 * 60 + 50,
    agentName: null,
    status: "new",
  },
  {
    id: "lq-8",
    customer: "Hira Malik",
    lastMessage: "Payment screenshot bhej di hai",
    waitSeconds: 3 * 60 + 20,
    agentName: "Sara",
    status: "pending",
  },
  {
    id: "lq-9",
    customer: "Zain Ali",
    lastMessage: "Address update karna hai",
    waitSeconds: 2 * 60 + 5,
    agentName: "Ayesha",
    status: "pending",
  },
  {
    id: "lq-10",
    customer: "Nadia Khan",
    lastMessage: "Coupon apply nahi ho raha",
    waitSeconds: 1 * 60 + 45,
    agentName: "Usman",
    status: "pending",
  },
];

export type MessengerNoReplyRow = {
  id: string;
  customer: string;
  lastMessage: string;
  agentName: string;
  agentOnline: boolean;
  withAgentSeconds: number;
  customerWaitingSeconds: number;
};

export const messengerNoReplyRows: MessengerNoReplyRow[] = [
  {
    id: "nr-1",
    customer: "Maryam Qureshi",
    lastMessage: "Payment kar di hai, confirm kar dein",
    agentName: "Danish Rauf",
    agentOnline: false,
    withAgentSeconds: 54 * 60 + 1,
    customerWaitingSeconds: 54 * 60 + 43,
  },
  {
    id: "nr-2",
    customer: "Laiba Rauf",
    lastMessage: "Kab tak delivery hogi order ki?",
    agentName: "Danish Rauf",
    agentOnline: false,
    withAgentSeconds: 46 * 60 + 10,
    customerWaitingSeconds: 46 * 60 + 55,
  },
  {
    id: "nr-3",
    customer: "Hamza Sheikh",
    lastMessage: "Order status check karna tha",
    agentName: "Usman Ghani",
    agentOnline: true,
    withAgentSeconds: 30 * 60 + 5,
    customerWaitingSeconds: 30 * 60 + 48,
  },
  {
    id: "nr-4",
    customer: "Sana Iqbal",
    lastMessage: "Refund kab process hoga?",
    agentName: "Usman Ghani",
    agentOnline: true,
    withAgentSeconds: 22 * 60 + 18,
    customerWaitingSeconds: 25 * 60 + 2,
  },
  {
    id: "nr-5",
    customer: "Bilal Ahmed",
    lastMessage: "Invoice resend kar dein please",
    agentName: "Danish Rauf",
    agentOnline: false,
    withAgentSeconds: 18 * 60 + 40,
    customerWaitingSeconds: 19 * 60 + 12,
  },
  {
    id: "nr-6",
    customer: "Fatima Zahra",
    lastMessage: "Wrong item received in parcel",
    agentName: "Usman Ghani",
    agentOnline: true,
    withAgentSeconds: 15 * 60 + 22,
    customerWaitingSeconds: 16 * 60 + 5,
  },
  {
    id: "nr-7",
    customer: "Ali Raza",
    lastMessage: "Cancel order before shipping",
    agentName: "Danish Rauf",
    agentOnline: false,
    withAgentSeconds: 12 * 60 + 8,
    customerWaitingSeconds: 12 * 60 + 50,
  },
  {
    id: "nr-8",
    customer: "Mehwish Tariq",
    lastMessage: "COD confirm kar dein",
    agentName: "Usman Ghani",
    agentOnline: true,
    withAgentSeconds: 9 * 60 + 33,
    customerWaitingSeconds: 10 * 60 + 1,
  },
  {
    id: "nr-9",
    customer: "Kashif Mehmood",
    lastMessage: "Tracking link expire ho gaya",
    agentName: "Danish Rauf",
    agentOnline: false,
    withAgentSeconds: 7 * 60 + 15,
    customerWaitingSeconds: 8 * 60 + 2,
  },
];

export type MessengerAgentRow = {
  id: string;
  name: string;
  online: boolean;
  replied: number;
  avgFirstReplySeconds: number | null;
  noReplyCount: number;
};

export const messengerAgents: MessengerAgentRow[] = [
  {
    id: "ag-usman",
    name: "Usman Ghani",
    online: true,
    replied: 17,
    avgFirstReplySeconds: 10 * 60 + 1,
    noReplyCount: 5,
  },
  {
    id: "ag-danish",
    name: "Danish Rauf",
    online: false,
    replied: 0,
    avgFirstReplySeconds: null,
    noReplyCount: 5,
  },
  {
    id: "ag-ayesha",
    name: "Ayesha Khan",
    online: true,
    replied: 12,
    avgFirstReplySeconds: 4 * 60 + 22,
    noReplyCount: 1,
  },
  {
    id: "ag-sara",
    name: "Sara Ahmed",
    online: true,
    replied: 9,
    avgFirstReplySeconds: 3 * 60 + 48,
    noReplyCount: 0,
  },
];

/** Kept for `/messenger-dashboard/queue` + `/assigned` simple tables. */
export type MessengerQueueChatRow = {
  id: string;
  customer: string;
  channel: string;
  waitingMinutes: number;
  lastMessage: string;
};

export const messengerDummyQueueChats: MessengerQueueChatRow[] =
  messengerLiveQueue
    .filter((r) => r.status === "new" || r.agentName === null)
    .map((r) => ({
      id: r.id,
      customer: r.customer,
      channel: "Messenger",
      waitingMinutes: Math.floor(r.waitSeconds / 60),
      lastMessage: r.lastMessage,
    }));

export type MessengerAssignedChatRow = {
  id: string;
  customer: string;
  agent: string;
  channel: string;
  status: "active" | "pending";
  lastMessage: string;
  withAgentMinutes: number;
  customerWaitingMinutes: number;
  agentOnline: boolean;
};

export const messengerDummyAssignedChats: MessengerAssignedChatRow[] =
  messengerNoReplyRows.map((r) => ({
    id: r.id,
    customer: r.customer,
    agent: r.agentName,
    channel: "Messenger",
    status: "pending" as const,
    lastMessage: r.lastMessage,
    withAgentMinutes: Math.floor(r.withAgentSeconds / 60),
    customerWaitingMinutes: Math.floor(r.customerWaitingSeconds / 60),
    agentOnline: r.agentOnline,
  }));
