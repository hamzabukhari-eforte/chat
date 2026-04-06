import type { Attachment } from "./types";

/** Origin for relative paths like `/attachments/chatmedia/...` (no trailing slash). */
export function getSesMediaOrigin(): string {
  if (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SES_MEDIA_ORIGIN?.trim()
  ) {
    return process.env.NEXT_PUBLIC_SES_MEDIA_ORIGIN.replace(/\/$/, "");
  }
  // Dev: always use the SES media server host.
  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "development"
  ) {
    return "http://10.0.10.53:8080";
  }

  // Build/production: derive origin from the current browser host.
  if (typeof window !== "undefined" && window.location?.host) {
    const protocol =
      window.location.protocol === "https:" ? "https://" : "http://";
    return `${protocol}${window.location.host}`.replace(/\/$/, "");
  }

  // Fallback for non-browser contexts.
  return "http://10.0.10.53:8080";
}

/**
 * API sometimes returns only a basename (e.g. `uuid.jpeg`) while the file lives at
 * `/recattachments/uuid.jpeg`. Same for absolute URLs whose path is just `/uuid.jpeg`.
 */
function normalizeBareToRecattachmentsPath(pathOrUrl: string): string {
  const s = pathOrUrl.trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      const p = u.pathname;
      if (p !== "/" && !p.includes("/recattachments/")) {
        const segs = p.split("/").filter(Boolean);
        if (segs.length === 1 && /\.[a-z0-9]{2,12}$/i.test(segs[0])) {
          u.pathname = `/recattachments/${segs[0]}`;
          return u.toString();
        }
      }
      return s;
    } catch {
      return s;
    }
  }
  const path = s.startsWith("/") ? s : `/${s}`;
  if (path.includes("/recattachments/")) return path;
  const segs = path.split("/").filter(Boolean);
  if (segs.length === 1 && /\.[a-z0-9]{2,12}$/i.test(segs[0])) {
    return `/recattachments/${segs[0]}`;
  }
  return path;
}

/**
 * Full URL for a relative path or pass-through for absolute `http(s)` URLs.
 * Relative paths use SES media origin (same host as API, e.g. :8080).
 */
function resolveMediaUrl(pathOrUrl: string): string {
  const s = pathOrUrl.trim();
  if (!s) return s;
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith("/") ? s : `/${s}`;
  const base = getSesMediaOrigin();
  return `${base}${path}`;
}

export function buildSesMediaUrl(filePath: string, fileName: string): string | null {
  const name = fileName.trim();
  if (!name) return null;
  const path = (filePath || "/").replace(/\/$/, "");
  const rel = `${path}/${name}`.replace(/([^:]\/)\/+/g, "$1");
  if (rel.startsWith("http")) return rel;
  return resolveMediaUrl(normalizeBareToRecattachmentsPath(rel));
}

/**
 * Build attachment list from SES `msgDetails` (WebSocket) or conversation API rows.
 * msgType is backend-specific; we infer image vs file from extension and common codes.
 */
export function attachmentsFromSesFields(
  fields: Record<string, unknown>,
  attachmentId: string,
): Attachment[] | undefined {
  // SES payloads use different field names depending on endpoint.
  // Examples:
  // - `fileName` + `filePath`
  // - `filename` or `actualFilename` (often includes the full relative path)
  let fileName = String(
    fields.fileName ?? fields.actualFilename ?? fields.filename ?? "",
  ).trim();
  let filePath = String(fields.filePath ?? "").trim();
  const message = String(fields.message ?? "").trim();
  const explicitUrl = String(
    fields.fileUrl ??
      fields.mediaUrl ??
      fields.attachmentUrl ??
      fields.videoUrl ??
      "",
  ).trim();
  const mimeHint = String(
    fields.mimeType ?? fields.contentType ?? fields.fileMimeType ?? "",
  ).trim();

  const rawType = fields.msgType ?? fields.messageType;
  const msgType =
    typeof rawType === "number"
      ? rawType
      : typeof rawType === "string"
        ? Number(rawType)
        : NaN;

  const messageLooksLikeFilename =
    message.length > 0 &&
    /\.[a-z0-9]{2,12}$/i.test(message) &&
    !/\s/.test(message);
  const hasAttachmentHint =
    Boolean(explicitUrl) ||
    Boolean(fileName) ||
    Boolean(filePath) ||
    messageLooksLikeFilename;

  // `1` = text-only in your convention — but some payloads still send file fields with msgType 1.
  if (Number.isFinite(msgType) && msgType === 1 && !hasAttachmentHint) {
    return undefined;
  }

  // If backend gave us a combined relative path in `filename` (e.g. `/attachments/.../a.jpg`)
  // and `filePath` is missing, split it into `{ filePath, fileName }`.
  // Keep `/recattachments/...` as a single path (same as API) — do not split.
  if (
    fileName &&
    !filePath &&
    fileName.includes("/") &&
    !fileName.includes("/recattachments")
  ) {
    const lastSlash = fileName.lastIndexOf("/");
    const dir = fileName.slice(0, lastSlash);
    const base = fileName.slice(lastSlash + 1);
    if (base && dir) {
      filePath = dir;
      fileName = base;
    }
  }

  if (explicitUrl) {
    const url = resolveMediaUrl(
      normalizeBareToRecattachmentsPath(explicitUrl),
    );
    const name =
      fileName ||
      message ||
      explicitUrl.split("/").pop() ||
      "attachment";
    return [inferAttachment(attachmentId, name, url, msgType, mimeHint)];
  }

  const nameFromMessage =
    message && /\.[a-z0-9]{2,12}$/i.test(message) && !message.includes(" ")
      ? message
      : "";

  const effectiveName = fileName || nameFromMessage;
  if (!effectiveName) return undefined;

  const url = buildSesMediaUrl(filePath || "/", effectiveName);
  if (!url) return undefined;

  return [inferAttachment(attachmentId, effectiveName, url, msgType, mimeHint)];
}

/** Hide SES placeholder body (e.g. ".") when the row is media-only. */
export function stripSesPlaceholderCaption(
  text: string,
  hasAttachments: boolean,
): string {
  if (!hasAttachments) return text;
  const t = text.trim();
  if (t === "." || t === "") return "";
  return text;
}

/**
 * API often puts the real filename on the URL (`/recattachments/uuid.mp4`) while `fileName` is generic.
 */
function pickFilenameHintForAttachment(name: string, url: string): string {
  const n = name.trim();
  if (/\.[a-z0-9]{2,12}$/i.test(n)) return n;
  try {
    const pathOnly = url.split(/[?#]/)[0];
    const seg = pathOnly.split("/").filter(Boolean).pop() ?? "";
    if (seg) return seg;
  } catch {
    // ignore
  }
  return n;
}

function inferAttachment(
  id: string,
  name: string,
  url: string,
  msgType: number,
  mimeType?: string,
): Attachment {
  const mt = (mimeType ?? "").trim().toLowerCase();
  if (mt.startsWith("video/")) {
    return { id, type: "video", name, url, mimeType: mimeType || undefined };
  }
  if (mt.startsWith("audio/")) {
    return { id, type: "audio", name, url, mimeType: mimeType || undefined };
  }
  if (mt.startsWith("image/")) {
    return { id, type: "image", name, url, mimeType: mimeType || undefined };
  }

  const hint = pickFilenameHintForAttachment(name, url).toLowerCase();
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(hint);
  const isVideo = /\.(mp4|mov|m4v|mkv|avi|mpeg|mpg)$/i.test(hint);
  const isAudio =
    /\.(mp3|wav|ogg|webm|m4a|aac)$/i.test(hint) || msgType === 5 || msgType === 6;

  return {
    id,
    type: isImage
      ? "image"
      : isVideo
        ? "video"
        : isAudio
          ? "audio"
          : "document",
    name,
    url,
    mimeType: mimeType || undefined,
  };
}
