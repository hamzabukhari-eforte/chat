"use client";

import Image from "next/image";
import { FiHeart, FiMessageCircle, FiShare2, FiX } from "react-icons/fi";
import { formatFacebookPostTime } from "@/lib/facebook/formatPostTime";

function formatCount(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

interface FacebookPostImagePreviewModalProps {
  url: string;
  caption?: string;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  onClose: () => void;
}

export function FacebookPostImagePreviewModal({
  url,
  caption,
  likes,
  comments,
  shares,
  createdAt,
  onClose,
}: FacebookPostImagePreviewModalProps) {
  const captionText = caption?.trim() ?? "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Post image preview"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <div className="relative flex w-[min(90vw,40rem)] max-h-[min(90vh,780px)] flex-col overflow-hidden rounded-lg bg-white shadow-lg">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Close image preview"
        >
          <FiX className="h-4 w-4 text-gray-700" />
        </button>

        <div className="relative h-[min(52vh,520px)] w-full shrink-0 bg-black">
          <Image
            src={url}
            alt={captionText || "Post image"}
            fill
            unoptimized
            sizes="90vw"
            className="object-contain"
          />
        </div>

        <div className="shrink-0 space-y-3 bg-white px-5 py-4">
          {captionText ? (
            <p className="text-base leading-relaxed text-gray-900">{captionText}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1.5" title="Likes">
              <FiHeart className="h-4 w-4 shrink-0" aria-hidden />
              {formatCount(likes)}
            </span>
            <span className="inline-flex items-center gap-1.5" title="Comments">
              <FiMessageCircle className="h-4 w-4 shrink-0" aria-hidden />
              {formatCount(comments)}
            </span>
            <span className="inline-flex items-center gap-1.5" title="Shares">
              <FiShare2 className="h-4 w-4 shrink-0" aria-hidden />
              {formatCount(shares)}
            </span>
            <span className="ml-auto shrink-0 text-sm text-gray-500">
              {formatFacebookPostTime(createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
