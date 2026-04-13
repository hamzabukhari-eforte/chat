"use client";

import { useLayoutEffect, useRef } from "react";

const DEFAULT_MIN_PX = 44;
const DEFAULT_MAX_PX = 150;

/**
 * Keeps a controlled textarea height in sync with its content, clamped between
 * min/max (scrolls inside the box past max).
 */
export function useAutoGrowTextarea(
  value: string,
  options?: { minHeightPx?: number; maxHeightPx?: number },
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const minH = options?.minHeightPx ?? DEFAULT_MIN_PX;
  const maxH = options?.maxHeightPx ?? DEFAULT_MAX_PX;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const sh = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(sh, minH), maxH)}px`;
  }, [value, minH, maxH]);

  return ref;
}
