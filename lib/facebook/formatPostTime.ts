/**
 * Relative post time for Facebook inbox cards.
 * &lt; 7 days → relative phrase; otherwise calendar date.
 */
export function formatFacebookPostTime(
  createdAt: string,
  now: Date = new Date(),
): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "just now";

  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;

  if (diffMs < minuteMs) return "just now";
  if (diffMs < 2 * minuteMs) return "a minute ago";
  if (diffMs < hourMs) {
    return `${Math.floor(diffMs / minuteMs)} minutes ago`;
  }
  if (diffMs < 2 * hourMs) return "an hour ago";
  if (diffMs < dayMs) {
    return `${Math.floor(diffMs / hourMs)} hours ago`;
  }
  if (diffMs < 2 * dayMs) return "a day ago";
  if (diffMs < weekMs) {
    return `${Math.floor(diffMs / dayMs)} days ago`;
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
