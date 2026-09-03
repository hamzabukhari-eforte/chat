"use client";

import { FiHeart, FiLock, FiMessageCircle } from "react-icons/fi";
import { AvatarWithInitials } from "@/components/atoms/AvatarWithInitials";
import { formatFacebookPostTime } from "@/lib/facebook/formatPostTime";
import type { FacebookComment } from "@/lib/facebook/types";
import { cn } from "@/lib/utils";

function formatCount(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

/** Whether this agent may open / work on the comment from the list. */
export function commentCanBeOpenedByAgent(
  comment: FacebookComment,
  currentAgentId: string,
): boolean {
  if (comment.isClosed) return true;
  if (!comment.repliedBy) return true;
  return comment.repliedBy.agentId === currentAgentId;
}

/** Whether this agent may send replies in an open thread. */
export function commentCanBeRepliedByAgent(
  comment: FacebookComment,
  currentAgentId: string,
): boolean {
  if (comment.isClosed) return false;
  if (!comment.repliedBy) return true;
  return comment.repliedBy.agentId === currentAgentId;
}

interface FacebookCommentCardProps {
  comment: FacebookComment;
  currentAgentId: string;
  selected?: boolean;
  onSelect?: (commentId: string) => void;
}

export function FacebookCommentCard({
  comment,
  currentAgentId,
  selected = false,
  onSelect,
}: FacebookCommentCardProps) {
  const canOpen = commentCanBeOpenedByAgent(comment, currentAgentId);
  const repliedByMe =
    comment.repliedBy?.agentId === currentAgentId && Boolean(comment.repliedBy);
  const lockedForOthers = !canOpen;
  const lastBy = comment.lastRepliedBy;

  const statusLabel = comment.isClosed
    ? lastBy
      ? `Last replied by ${lastBy.agentName}`
      : "Closed"
    : comment.repliedBy
      ? repliedByMe
        ? "Replied by you"
        : `Replied by ${comment.repliedBy.agentName}`
      : null;

  return (
    <div
      role={onSelect && canOpen ? "button" : undefined}
      tabIndex={onSelect && canOpen ? 0 : undefined}
      aria-disabled={!canOpen}
      onClick={() => {
        if (!canOpen) return;
        onSelect?.(comment.id);
      }}
      onKeyDown={(e) => {
        if (!canOpen || !onSelect) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(comment.id);
        }
      }}
      className={cn(
        "mb-1 flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        lockedForOthers && "opacity-75",
        canOpen ? "cursor-pointer" : "cursor-not-allowed",
        selected && canOpen
          ? "border-brand-100 bg-brand-50"
          : "border-transparent",
        canOpen && !selected && "hover:bg-gray-50",
        lockedForOthers && "bg-gray-50/80",
      )}
    >
      <AvatarWithInitials
        name={comment.authorName}
        src={comment.authorAvatarUrl}
        size={40}
        className="ring-1 ring-gray-100"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-gray-900">
            {comment.authorName}
          </p>
          <span className="shrink-0 text-[11px] text-gray-400">
            {formatFacebookPostTime(comment.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-gray-700">
          {comment.text}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1" title="Likes">
            <FiHeart className="h-3 w-3 shrink-0" aria-hidden />
            {formatCount(comment.likes)}
          </span>
          <span className="inline-flex items-center gap-1" title="Replies">
            <FiMessageCircle className="h-3 w-3 shrink-0" aria-hidden />
            {formatCount(comment.repliesCount)}
          </span>
          {statusLabel ? (
            <span
              className={cn(
                "ml-auto inline-flex max-w-[55%] items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                comment.isClosed
                  ? "bg-amber-50 text-amber-800"
                  : repliedByMe
                    ? "bg-brand-50 text-brand-700"
                    : "bg-gray-100 text-gray-600",
              )}
            >
              {lockedForOthers ? (
                <FiLock className="h-2.5 w-2.5 shrink-0" aria-hidden />
              ) : null}
              <span className="truncate">{statusLabel}</span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
