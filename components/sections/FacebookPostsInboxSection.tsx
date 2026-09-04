"use client";

import { useEffect, useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import { FacebookCommentCard } from "@/components/atoms/FacebookCommentCard";
import { FacebookPostCard } from "@/components/atoms/FacebookPostCard";
import { FacebookPostImagePreviewModal } from "@/components/atoms/FacebookPostImagePreviewModal";
import {
  FacebookCommentReplyPanel,
  type ReplyTarget,
} from "@/components/sections/FacebookCommentReplyPanel";
import { cloneAllDummyComments } from "@/lib/facebook/dummyComments";
import { DUMMY_FACEBOOK_POSTS } from "@/lib/facebook/dummyPosts";
import type {
  FacebookComment,
  FacebookPost,
  FacebookThreadReply,
} from "@/lib/facebook/types";
import { cloneAllDummyInstagramComments } from "@/lib/instagram/dummyComments";
import { DUMMY_INSTAGRAM_POSTS } from "@/lib/instagram/dummyPosts";
import { cn } from "@/lib/utils";

export type SocialPostsPlatform = "facebook" | "instagram";

type FacebookListTab = "posts" | "comments";
type CommentFilter = "all" | "replied-by-me";

const PLATFORM_INBOX = {
  facebook: {
    posts: DUMMY_FACEBOOK_POSTS,
    cloneComments: cloneAllDummyComments,
    listAriaLabel: "Facebook inbox lists",
  },
  instagram: {
    posts: DUMMY_INSTAGRAM_POSTS,
    cloneComments: cloneAllDummyInstagramComments,
    listAriaLabel: "Instagram inbox lists",
  },
} as const;

/** Insert a reply after its parent (and that parent's existing children). */
function insertReplyUnderParent(
  thread: FacebookThreadReply[],
  reply: FacebookThreadReply,
): FacebookThreadReply[] {
  if (!reply.inReplyToId) return [...thread, reply];

  const parentIndex = thread.findIndex((r) => r.id === reply.inReplyToId);
  if (parentIndex < 0) return [...thread, reply];

  const descendantIds = new Set<string>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const item of thread) {
      if (
        item.inReplyToId &&
        (item.inReplyToId === reply.inReplyToId ||
          descendantIds.has(item.inReplyToId)) &&
        !descendantIds.has(item.id)
      ) {
        descendantIds.add(item.id);
        grew = true;
      }
    }
  }

  let lastIndex = parentIndex;
  for (let i = 0; i < thread.length; i++) {
    if (descendantIds.has(thread[i].id)) lastIndex = Math.max(lastIndex, i);
  }

  const next = [...thread];
  next.splice(lastIndex + 1, 0, reply);
  return next;
}

function PostsColumn({
  posts,
  selectedPostId,
  isVisible,
  className,
  onSelectPost,
  onPreviewImage,
}: {
  posts: FacebookPost[];
  selectedPostId: string | null;
  isVisible: boolean;
  className?: string;
  onSelectPost: (postId: string) => void;
  onPreviewImage: (post: FacebookPost) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    const terms = q.split(/\s+/).filter(Boolean);
    return posts.filter((post) => {
      const haystack = post.caption.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [posts, search]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col border-gray-200",
        isVisible ? "flex flex-1 xl:flex-none" : "hidden xl:flex",
        className,
      )}
    >
      <div className="shrink-0 border-b border-gray-100 p-3 sm:p-4">
        <div className="mb-3 hidden items-center justify-between xl:flex">
          <h3 className="text-sm font-semibold text-gray-700">Posts</h3>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
            {posts.length}
          </span>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search posts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-32 items-center justify-center p-4">
            <p className="text-center text-sm text-gray-400">
              {search.trim()
                ? "No matching posts found."
                : "No posts available yet."}
            </p>
          </div>
        ) : (
          filtered.map((post) => (
            <FacebookPostCard
              key={post.id}
              post={post}
              selected={post.id === selectedPostId}
              onSelect={onSelectPost}
              onPreviewImage={onPreviewImage}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentsColumn({
  comments,
  currentAgentId,
  selectedCommentId,
  selectedPostId,
  isVisible,
  className,
  onSelectComment,
}: {
  comments: FacebookComment[];
  currentAgentId: string;
  selectedCommentId: string | null;
  selectedPostId: string | null;
  isVisible: boolean;
  className?: string;
  onSelectComment: (commentId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CommentFilter>("all");

  useEffect(() => {
    setSearch("");
    setFilter("all");
  }, [selectedPostId]);

  const filtered = useMemo(() => {
    let list = comments;
    if (filter === "replied-by-me") {
      list = list.filter(
        (c) =>
          c.repliedBy?.agentId === currentAgentId ||
          c.lastRepliedBy?.agentId === currentAgentId,
      );
    }
    const q = search.trim().toLowerCase();
    if (!q) return list;
    const terms = q.split(/\s+/).filter(Boolean);
    return list.filter((comment) => {
      const haystack = `${comment.authorName} ${comment.text}`.toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [comments, filter, search, currentAgentId]);

  const emptyMessage = !selectedPostId
    ? "Select a post to see its comments."
    : search.trim()
      ? "No matching comments found."
      : filter === "replied-by-me"
        ? "No comments replied by you for this post."
        : "No comments on this post yet.";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col border-gray-200",
        isVisible ? "flex flex-1 xl:flex-none" : "hidden xl:flex",
        className,
      )}
    >
      <div className="shrink-0 border-b border-gray-100 p-3 sm:p-4">
        <div className="mb-3 hidden items-center justify-between xl:flex">
          <h3 className="text-sm font-semibold text-gray-700">Posts Comments</h3>
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-600">
            {comments.length}
          </span>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search comments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={!selectedPostId}
            className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <div
          className="mt-2.5 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter comments"
        >
          <button
            type="button"
            disabled={!selectedPostId}
            onClick={() => setFilter("all")}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              filter === "all"
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            All
          </button>
          <button
            type="button"
            disabled={!selectedPostId}
            onClick={() => setFilter("replied-by-me")}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              filter === "replied-by-me"
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            Replied by me
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="flex h-full min-h-32 items-center justify-center p-4">
            <p className="text-center text-sm text-gray-400">{emptyMessage}</p>
          </div>
        ) : (
          filtered.map((comment) => (
            <FacebookCommentCard
              key={comment.id}
              comment={comment}
              currentAgentId={currentAgentId}
              selected={comment.id === selectedCommentId}
              onSelect={onSelectComment}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface FacebookPostsInboxSectionProps {
  agentId: string;
  agentName: string;
  /** Defaults to Facebook; Instagram reuses the same posts/comments UX. */
  platform?: SocialPostsPlatform;
}

/**
 * Social page comments inbox — Posts / Posts Comments + reply pane.
 * Used for Facebook and Instagram (dummy data until APIs are wired).
 */
export function FacebookPostsInboxSection({
  agentId,
  agentName,
  platform = "facebook",
}: FacebookPostsInboxSectionProps) {
  const inbox = PLATFORM_INBOX[platform];
  const posts = inbox.posts;

  const [listTab, setListTab] = useState<FacebookListTab>("posts");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null,
  );
  const [imagePreview, setImagePreview] = useState<FacebookPost | null>(null);
  const [commentsByPost, setCommentsByPost] = useState(inbox.cloneComments);

  useEffect(() => {
    setListTab("posts");
    setSelectedPostId(null);
    setSelectedCommentId(null);
    setImagePreview(null);
    setCommentsByPost(inbox.cloneComments());
  }, [platform, inbox]);

  const postComments = useMemo(
    () => (selectedPostId ? commentsByPost[selectedPostId] ?? [] : []),
    [commentsByPost, selectedPostId],
  );

  const selectedPost = posts.find((p) => p.id === selectedPostId) ?? null;
  const selectedComment =
    postComments.find((c) => c.id === selectedCommentId) ?? null;

  useEffect(() => {
    if (!imagePreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImagePreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imagePreview]);

  const updateComment = (
    postId: string,
    commentId: string,
    updater: (c: FacebookComment) => FacebookComment,
  ) => {
    setCommentsByPost((prev) => {
      const list = prev[postId] ?? [];
      return {
        ...prev,
        [postId]: list.map((c) => (c.id === commentId ? updater(c) : c)),
      };
    });
  };

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId);
    setSelectedCommentId(null);
    setListTab("comments");
  };

  const handleSelectComment = (commentId: string) => {
    setSelectedCommentId(commentId);
  };

  const handleCloseThread = () => {
    if (!selectedPostId || !selectedComment) return;
    const owner =
      selectedComment.repliedBy ??
      selectedComment.lastRepliedBy ?? {
        agentId,
        agentName,
      };
    updateComment(selectedPostId, selectedComment.id, (c) => ({
      ...c,
      isClosed: true,
      repliedBy: null,
      lastRepliedBy: owner,
    }));
  };

  const handleReopenThread = () => {
    if (!selectedPostId || !selectedComment) return;
    updateComment(selectedPostId, selectedComment.id, (c) => ({
      ...c,
      isClosed: false,
      repliedBy: { agentId, agentName },
      lastRepliedBy: { agentId, agentName },
    }));
  };

  const handleSendReply = (text: string, target: ReplyTarget) => {
    if (!selectedPostId || !selectedComment) return;
    const isSpecific = target.type === "thread";
    const reply: FacebookThreadReply = {
      id: `r-${Date.now()}`,
      inReplyToId: isSpecific ? target.reply.id : null,
      inReplyToAuthorName: isSpecific
        ? target.reply.authorName
        : selectedComment.authorName,
      inReplyToText: isSpecific
        ? target.reply.text
        : selectedComment.text,
      authorName: agentName,
      isFromAgent: true,
      agentId,
      text,
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    updateComment(selectedPostId, selectedComment.id, (c) => {
      const thread = insertReplyUnderParent(c.thread, reply);
      return {
        ...c,
        isClosed: false,
        repliedBy: { agentId, agentName },
        lastRepliedBy: { agentId, agentName },
        thread,
        repliesCount: thread.length,
      };
    });
  };

  const showReplyPane = Boolean(selectedPost && selectedComment);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden xl:flex-row">
      <aside
        className={cn(
          "flex h-full min-h-0 w-full shrink-0 flex-col border-b border-gray-200 bg-white",
          "max-xl:flex-1 max-xl:min-h-0",
          showReplyPane && "max-xl:hidden",
          "xl:h-full xl:w-[min(100%,40rem)] xl:min-w-0 xl:flex-row xl:border-b-0 xl:border-r xl:border-gray-200 2xl:w-180",
        )}
      >
        <div
          className="flex shrink-0 border-b border-gray-100 bg-white xl:hidden"
          role="tablist"
          aria-label={inbox.listAriaLabel}
        >
          <button
            type="button"
            role="tab"
            aria-selected={listTab === "posts"}
            onClick={() => setListTab("posts")}
            className={cn(
              "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors",
              listTab === "posts"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-800",
            )}
          >
            Posts
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                listTab === "posts"
                  ? "bg-brand-100 text-brand-700"
                  : "bg-gray-200 text-gray-600",
              )}
            >
              {posts.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listTab === "comments"}
            onClick={() => setListTab("comments")}
            className={cn(
              "flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 border-b-2 px-3 text-sm font-semibold transition-colors",
              listTab === "comments"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-800",
            )}
          >
            Posts Comments
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                listTab === "comments"
                  ? "bg-brand-100 text-brand-700"
                  : "bg-gray-200 text-gray-600",
              )}
            >
              {postComments.length}
            </span>
          </button>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row">
          <PostsColumn
            posts={posts}
            selectedPostId={selectedPostId}
            isVisible={listTab === "posts"}
            className="xl:w-1/2 xl:border-r max-w-[400px]"
            onSelectPost={handleSelectPost}
            onPreviewImage={(post) => setImagePreview(post)}
          />
          <CommentsColumn
            comments={postComments}
            currentAgentId={agentId}
            selectedCommentId={selectedCommentId}
            selectedPostId={selectedPostId}
            isVisible={listTab === "comments"}
            className="xl:w-1/2 max-w-[400px]"
            onSelectComment={handleSelectComment}
          />
        </div>
      </aside>

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
          !showReplyPane && "max-xl:hidden",
        )}
      >
        {showReplyPane && selectedPost && selectedComment ? (
          <FacebookCommentReplyPanel
            post={selectedPost}
            comment={selectedComment}
            agentId={agentId}
            agentName={agentName}
            onCloseThread={handleCloseThread}
            onReopenThread={handleReopenThread}
            onSendReply={handleSendReply}
            onDismiss={() => setSelectedCommentId(null)}
          />
        ) : (
          <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-white">
            <div className="flex flex-1 items-center justify-center text-gray-400">
              <div className="px-6 text-center">
                <HiOutlineChatBubbleLeftRight className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                <p className="text-lg font-medium text-gray-500">
                  Select a comment to start replying
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  Choose post and its comment from Post Comments
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      {imagePreview ? (
        <FacebookPostImagePreviewModal
          url={imagePreview.imageUrl}
          caption={imagePreview.caption}
          likes={imagePreview.likes}
          comments={imagePreview.comments}
          shares={imagePreview.shares}
          createdAt={imagePreview.createdAt}
          onClose={() => setImagePreview(null)}
        />
      ) : null}
    </div>
  );
}
