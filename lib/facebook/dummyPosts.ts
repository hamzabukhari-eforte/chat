import { DUMMY_FACEBOOK_COMMENTS_BY_POST } from "./dummyComments";
import type { FacebookPost } from "./types";

const minutesAgo = (n: number) =>
  new Date(Date.now() - n * 60_000).toISOString();
const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 3_600_000).toISOString();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();

const commentCount = (postId: string) =>
  DUMMY_FACEBOOK_COMMENTS_BY_POST[postId]?.length ?? 0;

/** Placeholder banking posts until Facebook APIs are wired. */
export const DUMMY_FACEBOOK_POSTS: FacebookPost[] = [
  {
    id: "post-1",
    imageUrl: "https://picsum.photos/seed/bank-savings/400/400",
    caption:
      "Open a high-yield savings account today and watch your money grow. Competitive rates, no hidden fees — apply online in minutes.",
    likes: 128,
    comments: commentCount("post-1"),
    shares: 9,
    createdAt: minutesAgo(3),
  },
  {
    id: "post-2",
    imageUrl: "https://picsum.photos/seed/bank-mobile/400/400",
    caption:
      "Banking on the go: transfer funds, pay bills, and check balances securely with our mobile app. Download now.",
    likes: 56,
    comments: commentCount("post-2"),
    shares: 2,
    createdAt: hoursAgo(5),
  },
  {
    id: "post-3",
    imageUrl: "https://picsum.photos/seed/bank-home-loan/400/400",
    caption:
      "Home loan rates starting from 8.5%*. Flexible tenures and fast approval. Talk to our relationship manager this week.",
    likes: 312,
    comments: commentCount("post-3"),
    shares: 18,
    createdAt: daysAgo(4),
  },
  {
    id: "post-4",
    imageUrl: "https://picsum.photos/seed/bank-branch/400/400",
    caption:
      "Branch hours update: Mon–Fri 9am–5pm, Sat 9am–1pm. Prefer not to visit? Book a video consultation with our advisors.",
    likes: 89,
    comments: commentCount("post-4"),
    shares: 4,
    createdAt: daysAgo(12),
  },
  {
    id: "post-5",
    imageUrl: "https://picsum.photos/seed/bank-card/400/400",
    caption:
      "Fraud alert tip: never share your OTP or PIN. Our team will never ask for these details over call or chat.",
    likes: 1004,
    comments: commentCount("post-5"),
    shares: 61,
    createdAt: daysAgo(1),
  },
];
