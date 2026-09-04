import { DUMMY_INSTAGRAM_COMMENTS_BY_POST } from "./dummyComments";
import type { FacebookPost } from "@/lib/facebook/types";

const minutesAgo = (n: number) =>
  new Date(Date.now() - n * 60_000).toISOString();
const hoursAgo = (n: number) =>
  new Date(Date.now() - n * 3_600_000).toISOString();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();

const commentCount = (postId: string) =>
  DUMMY_INSTAGRAM_COMMENTS_BY_POST[postId]?.length ?? 0;

/** Placeholder banking posts until Instagram APIs are wired. */
export const DUMMY_INSTAGRAM_POSTS: FacebookPost[] = [
  {
    id: "ig-post-1",
    imageUrl: "https://picsum.photos/seed/ig-debit-card/400/400",
    caption:
      "New look, same seamless spending ✨ Tap to pay, track rewards in-app, and shop worry-free. Link in bio to apply. #BankingReels #Cashback",
    likes: 842,
    comments: commentCount("ig-post-1"),
    shares: 36,
    createdAt: minutesAgo(12),
  },
  {
    id: "ig-post-2",
    imageUrl: "https://picsum.photos/seed/ig-savings/400/400",
    caption:
      "30-day savings challenge starts now 💪 Auto-save round-ups and watch small deposits add up. Ready to join? #SaveSmart",
    likes: 512,
    comments: commentCount("ig-post-2"),
    shares: 28,
    createdAt: hoursAgo(4),
  },
  {
    id: "ig-post-3",
    imageUrl: "https://picsum.photos/seed/ig-giveaway/400/400",
    caption:
      "GIVEAWAY 🎁 Follow us, like this post, and tag a friend for a chance to win a premium card upgrade. Ends Sunday midnight.",
    likes: 2104,
    comments: commentCount("ig-post-3"),
    shares: 119,
    createdAt: daysAgo(2),
  },
  {
    id: "ig-post-4",
    imageUrl: "https://picsum.photos/seed/ig-branch/400/400",
    caption:
      "Weekend banking, sorted. Book a branch slot or hop on a video call with an advisor — all from the app.",
    likes: 267,
    comments: commentCount("ig-post-4"),
    shares: 11,
    createdAt: daysAgo(8),
  },
  {
    id: "ig-post-5",
    imageUrl: "https://picsum.photos/seed/ig-security/400/400",
    caption:
      "Security tip: we will NEVER ask for your OTP or PIN in DMs or comments. Spot something shady? Report it. #StaySafe",
    likes: 1560,
    comments: commentCount("ig-post-5"),
    shares: 94,
    createdAt: daysAgo(1),
  },
];
