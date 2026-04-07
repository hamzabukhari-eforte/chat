"use client";

import { useState } from "react";

/**
 * Inline MP4 (and other browser-supported) playback for chat attachments.
 * Native `<video>` keeps a stable box size in flex layouts (`min-w` / `aspect-video`).
 */
type Props = {
  url: string;
  className?: string;
  /** Max width in px for inline chat (default 280). */
  maxWidth?: number;
};

export function ChatVideoPlayer({ url, className = "", maxWidth = 280 }: Props) {
  const [loadError, setLoadError] = useState(false);

  if (!url) return null;

  if (loadError) {
    return (
      <div
        className={`flex min-h-[120px] min-w-[200px] max-w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center ${className}`}
        style={{ maxWidth }}
      >
        <p className="text-xs text-gray-600">Could not load video.</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 text-xs font-medium text-brand-600 hover:underline"
        >
          Open link
        </a>
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-video w-full min-w-3xs max-w-full shrink-0 overflow-hidden rounded-lg bg-black ${className}`}
      style={{ maxWidth }}
    >
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-contain"
        onError={() => setLoadError(true)}
      />
    </div>
  );
}
