import type {
  FacebookComment,
  FacebookThreadReply,
} from "@/lib/facebook/types";

const minutesAgo = (n: number) =>
  new Date(Date.now() - n * 60_000).toISOString();
const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 3_600_000).toISOString();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();

/** Demo agent id for placeholder Instagram comments (not live SES session). */
export const DEMO_INSTAGRAM_AGENT_ID = "mahnoor.z";
export const DEMO_INSTAGRAM_AGENT_NAME = "Mahnoor";
const OTHER_AGENT = { agentId: "ali.k", agentName: "Ali Khan" };

function thread(items: FacebookThreadReply[]): FacebookThreadReply[] {
  return items;
}

/** Placeholder comments per Instagram post until Instagram APIs are wired. */
export const DUMMY_INSTAGRAM_COMMENTS_BY_POST: Record<
  string,
  FacebookComment[]
> = {
  "ig-post-1": [
    {
      id: "ig-c1-1",
      postId: "ig-post-1",
      authorName: "Hira Shah",
      authorAvatarUrl: "https://randomuser.me/api/portraits/women/65.jpg",
      text: "Love this reel energy 🔥 What’s the APR on the new debit card?",
      likes: 24,
      repliesCount: 3,
      createdAt: minutesAgo(28),
      repliedBy: {
        agentId: DEMO_INSTAGRAM_AGENT_ID,
        agentName: DEMO_INSTAGRAM_AGENT_NAME,
      },
      lastRepliedBy: {
        agentId: DEMO_INSTAGRAM_AGENT_ID,
        agentName: DEMO_INSTAGRAM_AGENT_NAME,
      },
      thread: thread([
        {
          id: "ig-c1-1-r1",
          inReplyToId: null,
          authorName: DEMO_INSTAGRAM_AGENT_NAME,
          isFromAgent: true,
          agentId: DEMO_INSTAGRAM_AGENT_ID,
          text: "Hi Hira — the card has no annual fee; cashback terms are in the link in bio.",
          likes: 5,
          createdAt: minutesAgo(22),
        },
        {
          id: "ig-c1-1-r2",
          inReplyToId: null,
          authorName: "Hira Shah",
          authorAvatarUrl: "https://randomuser.me/api/portraits/women/65.jpg",
          isFromAgent: false,
          text: "Perfect — can I apply from the app?",
          likes: 2,
          createdAt: minutesAgo(18),
        },
        {
          id: "ig-c1-1-r3",
          inReplyToId: "ig-c1-1-r1",
          inReplyToAuthorName: DEMO_INSTAGRAM_AGENT_NAME,
          inReplyToText:
            "Hi Hira — the card has no annual fee; cashback terms are in the link in bio.",
          authorName: "Danish Mehmood",
          authorAvatarUrl: "https://randomuser.me/api/portraits/men/22.jpg",
          isFromAgent: false,
          text: "Same — is international use enabled by default?",
          likes: 1,
          createdAt: minutesAgo(12),
        },
      ]),
    },
    {
      id: "ig-c1-2",
      postId: "ig-post-1",
      authorName: "Sana Rauf",
      authorAvatarUrl: "https://randomuser.me/api/portraits/women/29.jpg",
      text: "Drop the app store link please 🙏",
      likes: 8,
      repliesCount: 0,
      createdAt: hoursAgo(1),
      thread: [],
    },
    {
      id: "ig-c1-3",
      postId: "ig-post-1",
      authorName: "Tariq Aziz",
      authorAvatarUrl: "https://randomuser.me/api/portraits/men/36.jpg",
      text: "Do students get a waived annual fee?",
      likes: 6,
      repliesCount: 1,
      createdAt: hoursAgo(3),
      repliedBy: OTHER_AGENT,
      lastRepliedBy: OTHER_AGENT,
      thread: thread([
        {
          id: "ig-c1-3-r1",
          inReplyToId: null,
          authorName: OTHER_AGENT.agentName,
          isFromAgent: true,
          agentId: OTHER_AGENT.agentId,
          text: "Yes — student accounts get the annual fee waived with a valid student ID.",
          likes: 3,
          createdAt: hoursAgo(2),
        },
      ]),
    },
  ],
  "ig-post-2": [
    {
      id: "ig-c2-1",
      postId: "ig-post-2",
      authorName: "Nida Farooq",
      authorAvatarUrl: "https://randomuser.me/api/portraits/women/55.jpg",
      text: "Is the savings challenge still open this month?",
      likes: 14,
      repliesCount: 2,
      createdAt: hoursAgo(2),
      repliedBy: {
        agentId: DEMO_INSTAGRAM_AGENT_ID,
        agentName: DEMO_INSTAGRAM_AGENT_NAME,
      },
      lastRepliedBy: {
        agentId: DEMO_INSTAGRAM_AGENT_ID,
        agentName: DEMO_INSTAGRAM_AGENT_NAME,
      },
      thread: thread([
        {
          id: "ig-c2-1-r1",
          inReplyToId: null,
          authorName: DEMO_INSTAGRAM_AGENT_NAME,
          isFromAgent: true,
          agentId: DEMO_INSTAGRAM_AGENT_ID,
          text: "Yes — join from Stories highlights → Savings Challenge before the 25th.",
          likes: 4,
          createdAt: hoursAgo(1),
        },
        {
          id: "ig-c2-1-r2",
          inReplyToId: null,
          authorName: "Nida Farooq",
          authorAvatarUrl: "https://randomuser.me/api/portraits/women/55.jpg",
          isFromAgent: false,
          text: "Joined! When do winners get announced?",
          likes: 0,
          createdAt: minutesAgo(40),
        },
      ]),
    },
    {
      id: "ig-c2-2",
      postId: "ig-post-2",
      authorName: "Kamran Iqbal",
      authorAvatarUrl: "https://randomuser.me/api/portraits/men/61.jpg",
      text: "Can I set auto-save from salary day?",
      likes: 5,
      repliesCount: 0,
      createdAt: hoursAgo(5),
      thread: [],
    },
  ],
  "ig-post-3": [
    {
      id: "ig-c3-1",
      postId: "ig-post-3",
      authorName: "Rabia Nadeem",
      authorAvatarUrl: "https://randomuser.me/api/portraits/women/17.jpg",
      text: "Is the giveaway open to customers outside Karachi?",
      likes: 19,
      repliesCount: 1,
      createdAt: daysAgo(1),
      isClosed: true,
      repliedBy: null,
      lastRepliedBy: OTHER_AGENT,
      thread: thread([
        {
          id: "ig-c3-1-r1",
          inReplyToId: null,
          authorName: OTHER_AGENT.agentName,
          isFromAgent: true,
          agentId: OTHER_AGENT.agentId,
          text: "Yes — open nationwide. Follow + tag a friend to enter.",
          likes: 7,
          createdAt: hoursAgo(18),
        },
      ]),
    },
    {
      id: "ig-c3-2",
      postId: "ig-post-3",
      authorName: "Adeel Khan",
      authorAvatarUrl: "https://randomuser.me/api/portraits/men/85.jpg",
      text: "When does the contest close?",
      likes: 11,
      repliesCount: 0,
      createdAt: daysAgo(2),
      thread: [],
    },
  ],
  "ig-post-4": [
    {
      id: "ig-c4-1",
      postId: "ig-post-4",
      authorName: "Mehwish Ali",
      authorAvatarUrl: "https://randomuser.me/api/portraits/women/90.jpg",
      text: "Can I book a branch visit from the app for Saturday?",
      likes: 3,
      repliesCount: 0,
      createdAt: daysAgo(4),
      thread: [],
    },
  ],
  "ig-post-5": [
    {
      id: "ig-c5-1",
      postId: "ig-post-5",
      authorName: "Fahad Rizvi",
      authorAvatarUrl: "https://randomuser.me/api/portraits/men/45.jpg",
      text: "Got a DM asking for my OTP — is that your team?",
      likes: 42,
      repliesCount: 2,
      createdAt: hoursAgo(6),
      repliedBy: {
        agentId: DEMO_INSTAGRAM_AGENT_ID,
        agentName: DEMO_INSTAGRAM_AGENT_NAME,
      },
      lastRepliedBy: {
        agentId: DEMO_INSTAGRAM_AGENT_ID,
        agentName: DEMO_INSTAGRAM_AGENT_NAME,
      },
      thread: thread([
        {
          id: "ig-c5-1-r1",
          inReplyToId: null,
          authorName: DEMO_INSTAGRAM_AGENT_NAME,
          isFromAgent: true,
          agentId: DEMO_INSTAGRAM_AGENT_ID,
          text: "No — we never ask for OTPs in DMs. Please ignore and report the account.",
          likes: 18,
          createdAt: hoursAgo(5),
        },
        {
          id: "ig-c5-1-r2",
          inReplyToId: null,
          authorName: "Fahad Rizvi",
          authorAvatarUrl: "https://randomuser.me/api/portraits/men/45.jpg",
          isFromAgent: false,
          text: "Reported. Should I also freeze my card?",
          likes: 2,
          createdAt: hoursAgo(4),
        },
      ]),
    },
    {
      id: "ig-c5-2",
      postId: "ig-post-5",
      authorName: "Anum Javed",
      authorAvatarUrl: "https://randomuser.me/api/portraits/women/72.jpg",
      text: "Thanks for the heads-up — sharing this with my group.",
      likes: 9,
      repliesCount: 0,
      createdAt: daysAgo(1),
      isClosed: true,
      lastRepliedBy: {
        agentId: DEMO_INSTAGRAM_AGENT_ID,
        agentName: DEMO_INSTAGRAM_AGENT_NAME,
      },
      thread: [],
    },
  ],
};

export function cloneAllDummyInstagramComments(): Record<
  string,
  FacebookComment[]
> {
  const out: Record<string, FacebookComment[]> = {};
  for (const [postId, list] of Object.entries(
    DUMMY_INSTAGRAM_COMMENTS_BY_POST,
  )) {
    out[postId] = list.map((c) => ({
      ...c,
      thread: c.thread.map((r) => ({ ...r })),
      repliedBy: c.repliedBy ? { ...c.repliedBy } : c.repliedBy,
      lastRepliedBy: c.lastRepliedBy ? { ...c.lastRepliedBy } : c.lastRepliedBy,
    }));
  }
  return out;
}
