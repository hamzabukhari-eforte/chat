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

/** Normalize SES fields: JSON often sends the string `"null"` / `"undefined"`. */
function cleanSesScalar(v: unknown): string {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  const l = s.toLowerCase();
  if (l === "null" || l === "undefined") return "";
  return s;
}

/** `/` or empty is not a real media path — WS echoes use this and must not imply an attachment. */
function isMeaningfulSesFilePath(path: string): boolean {
  const p = path.trim();
  return p.length > 0 && p !== "/";
}

/** SES sometimes puts delivery UI strings (`sent`, `read`) in `fileName` — not real files. */
const SES_NON_FILE_BASENAME = new Set([
  "sent",
  "delivered",
  "read",
  "seen",
  "pending",
  "failed",
  "uploading",
  "received",
  "replied",
  "null",
  "undefined",
]);

function hasLikelyFileExtension(name: string): boolean {
  return /\.[a-z0-9]{2,12}$/i.test(name.trim());
}

/**
 * WebSocket payloads sometimes put message or DB ids in `fileName`. Real files almost always
 * have an extension; pure digits (no `.ext`) are treated as non-filenames for attachment rows.
 */
function looksLikePlausibleFileBasename(name: string): boolean {
  const s = name.trim();
  if (!s) return false;
  if (hasLikelyFileExtension(s)) return true;
  if (/^\d+$/.test(s)) return false;
  if (SES_NON_FILE_BASENAME.has(s.toLowerCase())) return false;
  return true;
}

/** Backend may synthesize `/attachments/chatmedia/sent/sent` for status — not a real media URL. */
function sesMediaUrlLooksLikeDeliveryPlaceholder(url: string): boolean {
  const raw = url.trim().toLowerCase();
  if (!raw) return true;
  try {
    const path = new URL(raw).pathname.toLowerCase();
    if (path.includes("/chatmedia/sent/sent")) return true;
    if (/\/sent\/sent\/?$/.test(path)) return true;
  } catch {
    if (/\/sent\/sent/i.test(raw)) return true;
  }
  return false;
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
  // Prefer user-facing names — `fileName` is often a storage key or msg id on the socket.
  let fileName = cleanSesScalar(
    fields.actualFilename ??
      fields.originalFileName ??
      fields.originalFilename ??
      fields.displayFileName ??
      fields.userFileName ??
      fields.FileDisplayName ??
      fields.fileName ??
      fields.filename,
  );
  let filePath = cleanSesScalar(fields.filePath);
  const message = cleanSesScalar(fields.message);
  const explicitUrl = cleanSesScalar(
    fields.fileUrl ??
      fields.mediaUrl ??
      fields.attachmentUrl ??
      fields.videoUrl,
  );
  const mimeHint = cleanSesScalar(
    fields.mimeType ?? fields.contentType ?? fields.fileMimeType,
  );

  // Drop msg/storage id masquerading as fileName so `filePath` / URL basename can win.
  if (fileName && /^\d{1,16}$/.test(fileName.trim())) {
    fileName = "";
  }

  const rawType =
    fields.msgType ??
    fields.messageType ??
    fields.MessageType ??
    fields.MsgType;
  const msgType =
    typeof rawType === "number"
      ? rawType
      : typeof rawType === "string"
        ? Number(String(rawType).trim())
        : NaN;

  const messageLooksLikeFilename =
    message.length > 0 &&
    /\.[a-z0-9]{2,12}$/i.test(message) &&
    !/\s/.test(message);

  /**
   * Type `1` = text — ignore stray `filePath` / `fileName` / status noise.
   * Some APIs still send `messageType: 1` with a real `fileUrl` or `fileName.jpg`; keep those.
   */
  const strongMediaEvidenceForType1 =
    Boolean(explicitUrl) ||
    (Boolean(fileName) && hasLikelyFileExtension(fileName)) ||
    messageLooksLikeFilename;

  if (Number.isFinite(msgType) && msgType === 1 && !strongMediaEvidenceForType1) {
    return undefined;
  }

  const hasAttachmentHint =
    Boolean(explicitUrl) ||
    Boolean(fileName) ||
    isMeaningfulSesFilePath(filePath) ||
    messageLooksLikeFilename;

  // Unknown/missing type: keep legacy heuristic so `loadConversationById` rows without type still work.
  if (!Number.isFinite(msgType) && !hasAttachmentHint) {
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

  // Some rows only set `filePath` (e.g. `/recattachments/doc.pdf`) with an empty `fileName`.
  if (!fileName && isMeaningfulSesFilePath(filePath)) {
    const base = filePath.split("/").filter(Boolean).pop() ?? "";
    if (looksLikePlausibleFileBasename(base)) {
      fileName = base;
    }
  }

  if (explicitUrl) {
    const url = resolveMediaUrl(
      normalizeBareToRecattachmentsPath(explicitUrl),
    );
    let fromUrl = "";
    try {
      const pathOnly = url.split(/[?#]/)[0];
      fromUrl = pathOnly.split("/").filter(Boolean).pop() ?? "";
    } catch {
      fromUrl = "";
    }
    let name =
      fileName && looksLikePlausibleFileBasename(fileName)
        ? fileName
        : message && /\.[a-z0-9]{2,12}$/i.test(message) && !message.includes(" ")
          ? message
          : "";
    if (!name || !looksLikePlausibleFileBasename(name)) {
      name =
        fromUrl && looksLikePlausibleFileBasename(fromUrl)
          ? fromUrl
          : fromUrl || "attachment";
    }
    if (sesMediaUrlLooksLikeDeliveryPlaceholder(url)) {
      return undefined;
    }
    return [inferAttachment(attachmentId, name, url, msgType, mimeHint)];
  }

  const nameFromMessage =
    message && /\.[a-z0-9]{2,12}$/i.test(message) && !message.includes(" ")
      ? message
      : "";

  const effectiveName = fileName || nameFromMessage;
  if (!effectiveName || !looksLikePlausibleFileBasename(effectiveName)) {
    return undefined;
  }

  const url = buildSesMediaUrl(filePath || "/", effectiveName);
  if (!url) return undefined;
  if (sesMediaUrlLooksLikeDeliveryPlaceholder(url)) {
    return undefined;
  }

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

function urlPathBasename(url: string): string {
  try {
    const pathOnly = url.split(/[?#]/)[0];
    return pathOnly.split("/").filter(Boolean).pop() ?? "";
  } catch {
    return "";
  }
}

/**
 * Socket/API often set `fileName` to msg id (`478`) or `123.png` while the real name is only in the URL path.
 */
function resolveAttachmentDisplayName(preferredName: string, url: string): string {
  const n = preferredName.trim();
  const base = urlPathBasename(url);
  const hasExt = (s: string) => /\.[a-z0-9]{2,12}$/i.test(s);
  if (!hasExt(base)) {
    return pickFilenameHintForAttachment(n, url);
  }

  const stem = (s: string) => s.replace(/\.[a-z0-9]+$/i, "");
  const baseStem = stem(base);
  const nameStem = stem(n);

  const baseHasLetters = /[a-z]/i.test(baseStem);
  const nameIsBareId = !n || /^\d{1,16}$/.test(n);
  const nameIsDigitsPlusExt =
    hasExt(n) && nameStem.length > 0 && /^\d+$/.test(nameStem);

  if (baseHasLetters && (nameIsBareId || nameIsDigitsPlusExt)) {
    return base;
  }
  if (nameIsBareId && hasExt(base)) {
    return base;
  }

  return pickFilenameHintForAttachment(n, url);
}

function inferAttachment(
  id: string,
  name: string,
  url: string,
  msgType: number,
  mimeType?: string,
): Attachment {
  const displayName = resolveAttachmentDisplayName(name, url);
  const mt = (mimeType ?? "").trim().toLowerCase();
  if (mt.startsWith("video/")) {
    return {
      id,
      type: "video",
      name: displayName,
      url,
      mimeType: mimeType || undefined,
    };
  }
  if (mt.startsWith("audio/")) {
    return {
      id,
      type: "audio",
      name: displayName,
      url,
      mimeType: mimeType || undefined,
    };
  }
  if (mt.startsWith("image/")) {
    return {
      id,
      type: "image",
      name: displayName,
      url,
      mimeType: mimeType || undefined,
    };
  }

  const hint = pickFilenameHintForAttachment(displayName, url).toLowerCase();
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
    name: displayName,
    url,
    mimeType: mimeType || undefined,
  };
}
