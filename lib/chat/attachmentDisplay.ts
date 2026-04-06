import type { Attachment } from "./types";

const VIDEO_EXT_RE = /\.(mp4|mov|m4v|webm|mkv|avi|mpeg|mpg)(\?|#|$)/i;

/** Use inline video when type or URL/name/mime clearly indicates video (API may send type "document"). */
export function attachmentShouldRenderAsVideo(att: Attachment): boolean {
  if (att.type === "video") return true;
  const m = att.mimeType?.toLowerCase() ?? "";
  if (m.startsWith("video/")) return true;
  const u = att.url || "";
  const n = att.name || "";
  return VIDEO_EXT_RE.test(u) || VIDEO_EXT_RE.test(n);
}
