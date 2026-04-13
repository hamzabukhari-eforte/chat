"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type ExpandableMessageTextTone = "inverse" | "default";

const MAX_CHARS = 750;
const MAX_LINES = 10;

type Props = {
  text: string;
  /** Extra classes on the paragraph (e.g. text color from bubble). */
  textClassName?: string;
  /** "inverse" = light link on brand bubbles; "default" = brand link on light bubbles. */
  tone?: ExpandableMessageTextTone;
};

const readMoreLessToneClass = (tone: ExpandableMessageTextTone) =>
  tone === "inverse"
    ? "text-white/90 hover:text-white"
    : "text-brand-600 hover:text-brand-700";

const readLessClass = (tone: ExpandableMessageTextTone) =>
  "mt-1.5 block text-left text-sm font-semibold cursor-pointer transition-colors " +
  (tone === "inverse"
    ? "text-white/85 hover:text-white"
    : "text-brand-600 hover:text-brand-700");

/**
 * Hybrid truncation: &gt; maxChars OR &gt; maxLines (scrollHeight vs lineHeight × lines).
 * Uses **prefix length** (binary search), not word split — preserves `\n` and `whitespace-pre-wrap` layout.
 * Trims trailing whitespace/newlines from the preview so "Read more" stays on the last content line.
 */
function computeTruncation(
  fullText: string,
  measureEl: HTMLElement,
  maxChars: number,
  maxLines: number,
): { needsTruncate: boolean; truncatedBody: string } {
  const full = fullText.replace(/\r\n/g, "\n");
  if (!full.trim()) {
    return { needsTruncate: false, truncatedBody: "" };
  }

  const lh = parseFloat(getComputedStyle(measureEl).lineHeight);
  const maxHeight = (Number.isFinite(lh) ? lh : 21) * maxLines + 2;

  const fitsPrefix = (len: number): boolean => {
    const sub = full.slice(0, len);
    measureEl.textContent = `${sub}… Read more`;
    return measureEl.scrollHeight <= maxHeight && sub.length <= maxChars;
  };

  measureEl.textContent = full;
  const fitsChars = full.length <= maxChars;
  const fitsLines = measureEl.scrollHeight <= maxHeight;

  if (fitsChars && fitsLines) {
    measureEl.textContent = `${full}… Read more`;
    if (measureEl.scrollHeight <= maxHeight) {
      return { needsTruncate: false, truncatedBody: full };
    }
  }

  const cap = Math.min(full.length, maxChars);
  let lo = 0;
  let hi = cap;
  let best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (fitsPrefix(mid)) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  let truncated = full.slice(0, best).trimEnd();

  if (truncated.length === 0 && full.length > 0) {
    truncated = full.slice(0, Math.min(1, maxChars, full.length));
  }

  return { needsTruncate: true, truncatedBody: truncated };
}

const measureBaseClass =
  "pointer-events-none fixed left-0 top-0 z-[-1] m-0 box-border max-w-none " +
  "whitespace-pre-wrap break-words text-sm leading-normal";

export function ExpandableMessageText({
  text,
  textClassName = "",
  tone = "default",
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncate, setNeedsTruncate] = useState(false);
  const [truncatedBody, setTruncatedBody] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);
  const prevTextRef = useRef(text);

  useEffect(() => {
    if (prevTextRef.current !== text) {
      prevTextRef.current = text;
      setExpanded(false);
    }
  }, [text]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureEl = measureRef.current;

    if (!text.trim()) {
      setNeedsTruncate(false);
      setTruncatedBody("");
      return;
    }

    if (expanded || !container || !measureEl) {
      return;
    }

    const run = () => {
      const w = container.offsetWidth;
      if (w <= 0) return;

      measureEl.style.width = `${w}px`;
      measureEl.style.visibility = "hidden";

      const { needsTruncate: nt, truncatedBody: tb } = computeTruncation(
        text,
        measureEl,
        MAX_CHARS,
        MAX_LINES,
      );
      setNeedsTruncate(nt);
      setTruncatedBody(tb);
    };

    run();
    const ro = new ResizeObserver(run);
    ro.observe(container);
    return () => ro.disconnect();
  }, [text, expanded, textClassName]);

  const bodyClass =
    "min-w-0 text-sm leading-normal whitespace-pre-wrap break-words " + textClassName;

  const readMoreSpanClass =
    "inline cursor-pointer font-semibold underline-offset-2 hover:underline " +
    "focus:outline-none focus-visible:ring-2 " +
    readMoreLessToneClass(tone) +
    (tone === "inverse"
      ? " focus-visible:ring-white/50"
      : " focus-visible:ring-brand-500/40");

  return (
    <div ref={containerRef} className="min-w-0">
      {!expanded ? (
        needsTruncate ? (
          <p className={bodyClass}>
            {truncatedBody}
            {"… "}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.preventDefault();
                setExpanded(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpanded(true);
                }
              }}
              className={readMoreSpanClass}
            >
              Read more
            </span>
          </p>
        ) : (
          <p className={bodyClass}>{text}</p>
        )
      ) : (
        <>
          <p className={bodyClass}>{text}</p>
          {needsTruncate ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className={readLessClass(tone)}
            >
              Read less
            </button>
          ) : null}
        </>
      )}

      <p
        ref={measureRef}
        aria-hidden="true"
        className={measureBaseClass + " " + textClassName}
      />
    </div>
  );
}
