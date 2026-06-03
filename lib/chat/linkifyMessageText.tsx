import type { ReactNode } from "react";

/** `https:` through the next whitespace (WhatsApp / Messenger message bodies). */
const HTTPS_URL_PATTERN = /https:[^\s]+/g;

export type LinkifyMessageTextTone = "inverse" | "default";

function linkClassName(tone: LinkifyMessageTextTone): string {
  return (
    "underline underline-offset-2 break-all cursor-pointer " +
    (tone === "inverse"
      ? "text-white hover:text-white/90"
      : "text-brand-700 hover:text-brand-800")
  );
}

/** Renders plain text with `https:…` segments as external links. */
export function linkifyMessageText(
  text: string,
  tone: LinkifyMessageTextTone = "default",
): ReactNode {
  if (!text.includes("https:")) return text;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let linkIndex = 0;

  for (const match of text.matchAll(HTTPS_URL_PATTERN)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    const url = match[0];
    parts.push(
      <a
        key={`msg-link-${linkIndex++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName(tone)}
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>,
    );
    lastIndex = start + url.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
}
