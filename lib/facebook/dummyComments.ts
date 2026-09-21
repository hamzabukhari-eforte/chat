import type { FacebookComment, FacebookThreadReply } from "./types";

const minutesAgo = (n: number) =>
  new Date(Date.now() - n * 60_000).toISOString();
const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 3_600_000).toISOString();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();

/** Placeholder agent for dummy Facebook threads (not a real SES login). */
export const DEMO_FACEBOOK_AGENT_ID = "demo.agent";
export const DEMO_FACEBOOK_AGENT_NAME = "Demo Agent";
const OTHER_AGENT = { agentId: "ali.k", agentName: "Ali Khan" };

function thread(
  items: FacebookThreadReply[],
): FacebookThreadReply[] {
  return items;
}

/** Placeholder comments per post until Facebook APIs are wired. */
export const DUMMY_FACEBOOK_COMMENTS_BY_POST: Record<string, FacebookComment[]> =
  {
    "post-1": [
      {
        id: "c1-1",
        postId: "post-1",
        authorName: "Sara Ahmed",
        authorAvatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
        text: "What is the minimum balance for the high-yield savings account?",
        likes: 12,
        repliesCount: 3,
        createdAt: minutesAgo(40),
        repliedBy: {
          agentId: DEMO_FACEBOOK_AGENT_ID,
          agentName: DEMO_FACEBOOK_AGENT_NAME,
        },
        lastRepliedBy: {
          agentId: DEMO_FACEBOOK_AGENT_ID,
          agentName: DEMO_FACEBOOK_AGENT_NAME,
        },
        thread: thread([
          {
            id: "c1-1-r1",
            inReplyToId: null,
            authorName: DEMO_FACEBOOK_AGENT_NAME,
            isFromAgent: true,
            agentId: DEMO_FACEBOOK_AGENT_ID,
            text: "Hi Sara — the minimum balance is PKR 10,000 to earn the promotional rate.",
            likes: 4,
            createdAt: minutesAgo(35),
          },
          {
            id: "c1-1-r2",
            inReplyToId: null,
            authorName: "Sara Ahmed",
            authorAvatarUrl: "https://randomuser.me/api/portraits/women/44.jpg",
            isFromAgent: false,
            text: "Thanks! Can I deposit that amount online?",
            likes: 1,
            createdAt: minutesAgo(30),
          },
          {
            id: "c1-1-r3",
            inReplyToId: "c1-1-r1",
            inReplyToAuthorName: DEMO_FACEBOOK_AGENT_NAME,
            inReplyToText:
              "Hi Sara — the minimum balance is PKR 10,000 to earn the promotional rate.",
            authorName: "Usman Raza",
            authorAvatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
            isFromAgent: false,
            text: "Same question — is the rate fixed for 6 months?",
            likes: 2,
            createdAt: minutesAgo(25),
          },
        ]),
      },
      {
        id: "c1-2",
        postId: "post-1",
        authorName: "Usman Raza",
        authorAvatarUrl: "https://randomuser.me/api/portraits/men/32.jpg",
        text: "Can I open this account online without visiting a branch?",
        likes: 5,
        repliesCount: 0,
        createdAt: hoursAgo(2),
        thread: [],
      },
      {
        id: "c1-3",
        postId: "post-1",
        authorName: "Nadia Iqbal",
        authorAvatarUrl: "https://randomuser.me/api/portraits/women/68.jpg",
        text: "Are there any early withdrawal penalties?",
        likes: 3,
        repliesCount: 1,
        createdAt: hoursAgo(6),
        repliedBy: OTHER_AGENT,
        lastRepliedBy: OTHER_AGENT,
        thread: thread([
          {
            id: "c1-3-r1",
            inReplyToId: null,
            authorName: OTHER_AGENT.agentName,
            isFromAgent: true,
            agentId: OTHER_AGENT.agentId,
            text: "Hi Nadia — early withdrawals before 6 months forfeit the bonus interest for that month.",
            likes: 2,
            createdAt: hoursAgo(5),
          },
        ]),
      },
    ],
    "post-2": [
      {
        id: "c2-1",
        postId: "post-2",
        authorName: "Bilal Hassan",
        authorAvatarUrl: "https://randomuser.me/api/portraits/men/11.jpg",
        text: "The app keeps asking me to re-login. Is there an outage?",
        likes: 18,
        repliesCount: 2,
        createdAt: hoursAgo(1),
        repliedBy: {
          agentId: DEMO_FACEBOOK_AGENT_ID,
          agentName: DEMO_FACEBOOK_AGENT_NAME,
        },
        lastRepliedBy: {
          agentId: DEMO_FACEBOOK_AGENT_ID,
          agentName: DEMO_FACEBOOK_AGENT_NAME,
        },
        thread: thread([
          {
            id: "c2-1-r1",
            inReplyToId: null,
            authorName: DEMO_FACEBOOK_AGENT_NAME,
            isFromAgent: true,
            agentId: DEMO_FACEBOOK_AGENT_ID,
            text: "We’re not seeing a platform outage. Please try clearing the app cache or reinstalling.",
            likes: 6,
            createdAt: minutesAgo(50),
          },
          {
            id: "c2-1-r2",
            inReplyToId: null,
            authorName: "Bilal Hassan",
            authorAvatarUrl: "https://randomuser.me/api/portraits/men/11.jpg",
            isFromAgent: false,
            text: "Cleared cache — still looping. Can you escalate?",
            likes: 0,
            createdAt: minutesAgo(45),
          },
        ]),
      },
      {
        id: "c2-2",
        postId: "post-2",
        authorName: "Fatima Noor",
        authorAvatarUrl: "https://randomuser.me/api/portraits/women/21.jpg",
        text: "How do I enable biometric login on Android?",
        likes: 7,
        repliesCount: 0,
        createdAt: hoursAgo(3),
        thread: [],
      },
    ],
    "post-3": [
      {
        id: "c3-1",
        postId: "post-3",
        authorName: "Omar Siddiqui",
        authorAvatarUrl: "https://randomuser.me/api/portraits/men/52.jpg",
        text: "Is the 8.5% rate for salaried customers only?",
        likes: 22,
        repliesCount: 1,
        createdAt: daysAgo(1),
        isClosed: true,
        repliedBy: null,
        lastRepliedBy: OTHER_AGENT,
        thread: thread([
          {
            id: "c3-1-r1",
            inReplyToId: null,
            authorName: OTHER_AGENT.agentName,
            isFromAgent: true,
            agentId: OTHER_AGENT.agentId,
            text: "The published rate applies to salaried and self-employed customers who meet eligibility.",
            likes: 5,
            createdAt: hoursAgo(20),
          },
        ]),
      },
      {
        id: "c3-2",
        postId: "post-3",
        authorName: "Ayesha Malik",
        authorAvatarUrl: "https://randomuser.me/api/portraits/women/33.jpg",
        text: "What documents are required for a home loan application?",
        likes: 15,
        repliesCount: 0,
        createdAt: daysAgo(2),
        thread: [],
      },
      {
        id: "c3-3",
        postId: "post-3",
        authorName: "Hassan Ali",
        authorAvatarUrl: "https://randomuser.me/api/portraits/men/75.jpg",
        text: "Do you offer Islamic / Shariah-compliant home financing?",
        likes: 31,
        repliesCount: 1,
        createdAt: daysAgo(3),
        repliedBy: {
          agentId: DEMO_FACEBOOK_AGENT_ID,
          agentName: DEMO_FACEBOOK_AGENT_NAME,
        },
        lastRepliedBy: {
          agentId: DEMO_FACEBOOK_AGENT_ID,
          agentName: DEMO_FACEBOOK_AGENT_NAME,
        },
        thread: thread([
          {
            id: "c3-3-r1",
            inReplyToId: null,
            authorName: DEMO_FACEBOOK_AGENT_NAME,
            isFromAgent: true,
            agentId: DEMO_FACEBOOK_AGENT_ID,
            text: "Yes — we offer Shariah-compliant home financing. I can connect you with our Islamic banking desk.",
            likes: 8,
            createdAt: daysAgo(2),
          },
        ]),
      },
    ],
    "post-4": [
      {
        id: "c4-1",
        postId: "post-4",
        authorName: "Zainab Khan",
        authorAvatarUrl: "https://randomuser.me/api/portraits/women/12.jpg",
        text: "Can I book a video consultation for Saturday morning?",
        likes: 4,
        repliesCount: 0,
        createdAt: daysAgo(5),
        thread: [],
      },
    ],
    "post-5": [
      {
        id: "c5-1",
        postId: "post-5",
        authorName: "Imran Qureshi",
        authorAvatarUrl: "https://randomuser.me/api/portraits/men/41.jpg",
        text: "I received a suspicious call asking for my OTP. What should I do?",
        likes: 64,
        repliesCount: 2,
        createdAt: hoursAgo(8),
        repliedBy: {
          agentId: DEMO_FACEBOOK_AGENT_ID,
          agentName: DEMO_FACEBOOK_AGENT_NAME,
        },
        lastRepliedBy: {
          agentId: DEMO_FACEBOOK_AGENT_ID,
          agentName: DEMO_FACEBOOK_AGENT_NAME,
        },
        thread: thread([
          {
            id: "c5-1-r1",
            inReplyToId: null,
            authorName: DEMO_FACEBOOK_AGENT_NAME,
            isFromAgent: true,
            agentId: DEMO_FACEBOOK_AGENT_ID,
            text: "Please do not share the OTP. Block the number and call our fraud helpline immediately.",
            likes: 21,
            createdAt: hoursAgo(7),
          },
          {
            id: "c5-1-r2",
            inReplyToId: null,
            authorName: "Imran Qureshi",
            authorAvatarUrl: "https://randomuser.me/api/portraits/men/41.jpg",
            isFromAgent: false,
            text: "Done — should I also freeze my card from the app?",
            likes: 3,
            createdAt: hoursAgo(6),
          },
        ]),
      },
      {
        id: "c5-2",
        postId: "post-5",
        authorName: "Maryam Shah",
        authorAvatarUrl: "https://randomuser.me/api/portraits/women/47.jpg",
        text: "Thanks for the reminder — sharing with my family.",
        likes: 9,
        repliesCount: 0,
        createdAt: daysAgo(1),
        isClosed: true,
        lastRepliedBy: {
          agentId: DEMO_FACEBOOK_AGENT_ID,
          agentName: DEMO_FACEBOOK_AGENT_NAME,
        },
        thread: [],
      },
    ],
  };

export function getDummyCommentsForPost(postId: string): FacebookComment[] {
  return (DUMMY_FACEBOOK_COMMENTS_BY_POST[postId] ?? []).map((c) => ({
    ...c,
    thread: c.thread.map((r) => ({ ...r })),
  }));
}

export function cloneAllDummyComments(): Record<string, FacebookComment[]> {
  const out: Record<string, FacebookComment[]> = {};
  for (const [postId, list] of Object.entries(DUMMY_FACEBOOK_COMMENTS_BY_POST)) {
    out[postId] = list.map((c) => ({
      ...c,
      thread: c.thread.map((r) => ({ ...r })),
      repliedBy: c.repliedBy ? { ...c.repliedBy } : c.repliedBy,
      lastRepliedBy: c.lastRepliedBy ? { ...c.lastRepliedBy } : c.lastRepliedBy,
    }));
  }
  return out;
}
