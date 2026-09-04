"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  FiCornerUpLeft,
  FiHeart,
  FiLock,
  FiSend,
  FiX,
} from "react-icons/fi";
import { AvatarWithInitials } from "@/components/atoms/AvatarWithInitials";
import { commentCanBeRepliedByAgent } from "@/components/atoms/FacebookCommentCard";
import { formatFacebookPostTime } from "@/lib/facebook/formatPostTime";
import type {
  FacebookComment,
  FacebookPost,
  FacebookThreadReply,
} from "@/lib/facebook/types";
import { cn } from "@/lib/utils";

function formatCount(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function truncateReplyPreview(text: string, max = 72): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

function ReplyToPreview({
  authorName,
  text,
}: {
  authorName: string;
  text?: string;
}) {
  return (
    <div className="min-w-0 border-l-2 border-brand-300 pl-2">
      <p className="text-[11px] text-gray-500">
        Replying to{" "}
        <span className="font-medium text-gray-700">{authorName}</span>
      </p>
      {text ? (
        <p className="mt-0.5 truncate text-[11px] leading-snug text-gray-400">
          {truncateReplyPreview(text)}
        </p>
      ) : null}
    </div>
  );
}

type ReplyTarget =
  | { type: "root" }
  | { type: "thread"; reply: FacebookThreadReply };

interface ReplyTreeNode {
  reply: FacebookThreadReply;
  children: ReplyTreeNode[];
}

interface FacebookCommentReplyPanelProps {
  post: FacebookPost;
  comment: FacebookComment;
  agentId: string;
  agentName: string;
  onCloseThread: () => void;
  onReopenThread: () => void;
  onSendReply: (text: string, target: ReplyTarget) => void;
  onDismiss: () => void;
}

/** Nest replies under the message they respond to (by `inReplyToId`). */
function buildReplyTree(thread: FacebookThreadReply[]): ReplyTreeNode[] {
  const ids = new Set(thread.map((r) => r.id));
  const byParent = new Map<string | null, FacebookThreadReply[]>();

  for (const reply of thread) {
    const parentKey =
      reply.inReplyToId && ids.has(reply.inReplyToId)
        ? reply.inReplyToId
        : null;
    const list = byParent.get(parentKey) ?? [];
    list.push(reply);
    byParent.set(parentKey, list);
  }

  const toNode = (reply: FacebookThreadReply): ReplyTreeNode => ({
    reply,
    children: (byParent.get(reply.id) ?? []).map(toNode),
  });

  return (byParent.get(null) ?? []).map(toNode);
}

function ThreadNode({
  node,
  depth,
  canReply,
  activeReplyId,
  onReply,
}: {
  node: ReplyTreeNode;
  depth: number;
  canReply: boolean;
  activeReplyId: string | null;
  onReply: (reply: FacebookThreadReply) => void;
}) {
  const { reply, children } = node;
  const isNested = depth > 0;
  const isActiveTarget = activeReplyId === reply.id;
  const showReplyContext = Boolean(
    reply.inReplyToId && reply.inReplyToAuthorName,
  );
  const depthIndent = [
    "",
    "ml-8 sm:ml-10",
    "ml-12 sm:ml-16",
    "ml-16 sm:ml-20",
    "ml-20 sm:ml-24",
  ] as const;
  const indentClass = depthIndent[Math.min(depth, depthIndent.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className={cn("flex max-w-[550px] gap-2.5", indentClass)}>
        <AvatarWithInitials
          name={reply.authorName}
          src={reply.authorAvatarUrl}
          size={isNested ? 28 : 36}
          className="ring-1 ring-gray-100"
        />
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "rounded-2xl px-3 py-2",
              reply.isFromAgent
                ? "border border-gray-300 bg-brand-50"
                : "bg-gray-100",
              isActiveTarget && "ring-2 ring-brand-400",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="text-sm font-semibold text-gray-900">
                {reply.authorName}
              </p>
              {reply.isFromAgent ? (
                <span className="rounded bg-brand-600 px-1.5 py-px text-[10px] font-semibold tracking-wide text-white uppercase">
                  Agent
                </span>
              ) : null}
              <span className="text-[11px] text-gray-400">
                {formatFacebookPostTime(reply.createdAt)}
              </span>
            </div>
            {showReplyContext ? (
              <div className="mt-1">
                <ReplyToPreview
                  authorName={reply.inReplyToAuthorName!}
                  text={reply.inReplyToText}
                />
              </div>
            ) : null}
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-gray-800">
              {reply.text}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-3 px-1 text-[11px] font-medium text-gray-500">
            <span className="inline-flex items-center gap-1">
              <FiHeart className="h-3 w-3" aria-hidden />
              {formatCount(reply.likes)}
            </span>
            {canReply ? (
              <button
                type="button"
                onClick={() => onReply(reply)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1",
                  isActiveTarget
                    ? "font-semibold text-brand-700"
                    : "text-brand-600 hover:text-brand-700",
                )}
              >
                <FiCornerUpLeft className="h-3 w-3" aria-hidden />
                Reply
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {children.map((child) => (
        <ThreadNode
          key={child.reply.id}
          node={child}
          depth={depth + 1}
          canReply={canReply}
          activeReplyId={activeReplyId}
          onReply={onReply}
        />
      ))}
    </div>
  );
}

export function FacebookCommentReplyPanel({
  post,
  comment,
  agentId,
  agentName,
  onCloseThread,
  onReopenThread,
  onSendReply,
  onDismiss,
}: FacebookCommentReplyPanelProps) {
  const [draft, setDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<ReplyTarget>({ type: "root" });
  const [hasExplicitTarget, setHasExplicitTarget] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const canReply = commentCanBeRepliedByAgent(comment, agentId);

  const replyToName =
    replyTarget.type === "thread"
      ? replyTarget.reply.authorName
      : comment.authorName;
  const replyToText =
    replyTarget.type === "thread" ? replyTarget.reply.text : comment.text;
  const showReplyBanner = hasExplicitTarget || replyTarget.type === "thread";
  const replyTree = buildReplyTree(comment.thread);
  const activeReplyId =
    replyTarget.type === "thread" ? replyTarget.reply.id : null;

  const selectReplyTarget = (target: ReplyTarget) => {
    setReplyTarget(target);
    setHasExplicitTarget(true);
    requestAnimationFrame(() => {
      composerRef.current?.focus();
    });
  };

  const clearReplyTarget = () => {
    setReplyTarget({ type: "root" });
    setHasExplicitTarget(false);
  };

  useEffect(() => {
    setDraft("");
    setReplyTarget({ type: "root" });
    setHasExplicitTarget(false);
  }, [comment.id]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [comment.id, comment.thread.length]);

  const submit = () => {
    const text = draft.trim();
    if (!text || !canReply) return;
    onSendReply(text, replyTarget);
    setDraft("");
    clearReplyTarget();
  };

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800">
            Reply to comment
          </p>
          <p className="truncate text-xs text-gray-500">
            {comment.isClosed
              ? comment.lastRepliedBy
                ? `Closed · Last replied by ${comment.lastRepliedBy.agentName}`
                : "Closed"
              : comment.repliedBy
                ? `Assigned to ${
                    comment.repliedBy.agentId === agentId
                      ? "you"
                      : comment.repliedBy.agentName
                  }`
                : "Open · Available to claim"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {comment.isClosed ? (
            <button
              type="button"
              onClick={onReopenThread}
              className="cursor-pointer rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700"
            >
              Reopen
            </button>
          ) : (
            <button
              type="button"
              onClick={onCloseThread}
              disabled={
                Boolean(comment.repliedBy) &&
                comment.repliedBy!.agentId !== agentId
              }
              className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Close reply
            </button>
          )}
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close panel"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* Centered post preview */}
        <div className="bg-gray-100/80">

        <div className="mx-auto flex max-w-lg flex-col items-center px-4 pt-6 pb-4 text-center">
          <div className="relative h-56 w-56 overflow-hidden rounded-xl bg-gray-200 ring-1 ring-gray-200">
            <Image
              src={post.imageUrl}
              alt=""
              fill
              unoptimized
              sizes="240px"
              className="object-cover"
            />
          </div>
          <p className="mt-3 text-sm leading-relaxed font-medium text-gray-800">
            {post.caption}
          </p>
        </div>
        </div>

        {/* Root comment — full-width container, capped bubble */}
        <div className="w-full border-t border-gray-200 px-4 pt-4 sm:px-6">
          <div className="flex max-w-[550px] items-start gap-2.5">
            <AvatarWithInitials
              name={comment.authorName}
              src={comment.authorAvatarUrl}
              size={40}
            />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "rounded-2xl bg-gray-100 px-3 py-2",
                  showReplyBanner &&
                    replyTarget.type === "root" &&
                    "ring-2 ring-brand-400",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {comment.authorName}
                  </p>
                  <span className="text-[11px] text-gray-400">
                    {formatFacebookPostTime(comment.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-gray-800">
                  {comment.text}
                </p>
              </div>
              <div className="mt-1 flex items-center gap-3 px-1 text-[11px] font-medium text-gray-500">
                <span className="inline-flex items-center gap-1">
                  <FiHeart className="h-3 w-3" aria-hidden />
                  {formatCount(comment.likes)}
                </span>
                {canReply ? (
                  <button
                    type="button"
                    onClick={() => selectReplyTarget({ type: "root" })}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1",
                      showReplyBanner && replyTarget.type === "root"
                        ? "font-semibold text-brand-700"
                        : "text-brand-600 hover:text-brand-700",
                    )}
                  >
                    <FiCornerUpLeft className="h-3 w-3" aria-hidden />
                    Reply
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* FB-style reply thread — nested by parent */}
        <div className="flex w-full flex-col gap-3 px-4 py-4 sm:px-6">
          {replyTree.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              No replies yet.
            </p>
          ) : (
            replyTree.map((node) => (
              <ThreadNode
                key={node.reply.id}
                node={node}
                depth={0}
                canReply={canReply}
                activeReplyId={activeReplyId}
                onReply={(reply) =>
                  selectReplyTarget({ type: "thread", reply })
                }
              />
            ))
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 sm:px-6">
        {!canReply ? (
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-600">
            <FiLock className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            {comment.isClosed
              ? `This reply is closed${
                  comment.lastRepliedBy
                    ? ` · Last replied by ${comment.lastRepliedBy.agentName}`
                    : ""
                }. Reopen to continue — previous replies stay as they are.`
              : `Only ${comment.repliedBy?.agentName ?? "the assigned agent"} can reply right now (1 agent at a time).`}
          </div>
        ) : (
          <div className="w-full space-y-2">
            {showReplyBanner ? (
              <div className="flex items-start justify-between gap-2 rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-800">
                <div className="min-w-0">
                  <p>
                    Replying to{" "}
                    <span className="font-semibold">{replyToName}</span>
                  </p>
                  <p className="mt-0.5 truncate text-[11px] leading-snug text-brand-700/70">
                    {truncateReplyPreview(replyToText)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearReplyTarget}
                  className="shrink-0 cursor-pointer font-medium hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <AvatarWithInitials name={agentName} size={36} />
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder={
                  showReplyBanner
                    ? `Reply to ${replyToName}…`
                    : `Write a public reply…`
                }
                className="min-h-11 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
              <button
                type="button"
                onClick={submit}
                disabled={!draft.trim()}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send reply"
              >
                <FiSend className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </footer>
    </section>
  );
}

export type { ReplyTarget };
