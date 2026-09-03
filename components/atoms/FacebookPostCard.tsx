"use client";

import Image from "next/image";
import { FiHeart, FiMessageCircle, FiShare2 } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { formatFacebookPostTime } from "@/lib/facebook/formatPostTime";
import type { FacebookPost } from "@/lib/facebook/types";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

interface FacebookPostCardProps {
  post: FacebookPost;
  selected?: boolean;
  onSelect?: (postId: string) => void;
  onPreviewImage: (post: FacebookPost) => void;
}

export function FacebookPostCard({
  post,
  selected = false,
  onSelect,
  onPreviewImage,
}: FacebookPostCardProps) {
  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(post.id)}
      onKeyDown={(e) => {
        if (!onSelect) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(post.id);
        }
      }}
      className={cn(
        "mb-1 flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        selected
          ? "border-brand-100 bg-brand-50"
          : "border-transparent hover:bg-gray-50",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onPreviewImage(post);
        }}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200 transition-opacity hover:opacity-90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
        aria-label="Preview post image"
      >
        <Image
          src={post.imageUrl}
          alt=""
          fill
          unoptimized
          sizes="56px"
          className="object-cover"
        />
      </button>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm leading-snug text-gray-800">
          {post.caption.trim() || "Untitled post"}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1" title="Likes">
            <FiHeart className="h-3 w-3 shrink-0" aria-hidden />
            {formatCount(post.likes)}
          </span>
          <span className="inline-flex items-center gap-1" title="Comments">
            <FiMessageCircle className="h-3 w-3 shrink-0" aria-hidden />
            {formatCount(post.comments)}
          </span>
          <span className="inline-flex items-center gap-1" title="Shares">
            <FiShare2 className="h-3 w-3 shrink-0" aria-hidden />
            {formatCount(post.shares)}
          </span>
          <span className="ml-auto shrink-0 text-gray-400">
            {formatFacebookPostTime(post.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
