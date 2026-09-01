/**
 * SES HTTP / WebSocket host resolution.
 * - HTTPS (production): same origin as the page
 * - HTTP (LAN): same hostname, API port 8080
 * - No browser (SSR): empty origin → path-only URLs (`/SES/...`); optional env override
 */

const DEFAULT_CHAT_WS_PATH = "/SES/WebLiveChat";

/** Always send session cookies; no development-only hardcoded `Userid` auth. */
export const SES_API_FETCH_CREDENTIALS: RequestCredentials = "include";

function readOptionalOriginEnv(): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env.NEXT_PUBLIC_SES_API_ORIGIN?.trim();
  return v ? v.replace(/\/$/, "") : undefined;
}

export function getSesApiOrigin(): string {
  const fromEnv = readOptionalOriginEnv();
  if (fromEnv) return fromEnv;

  if (typeof window === "undefined") {
    // Relative paths; do not invent a LAN IP for SSR.
    return "";
  }
  if (window.location.protocol === "https:") {
    return window.location.origin;
  }
  return `${window.location.protocol}//${window.location.hostname}:8080`;
}

export function getSesWebSocketUrl(
  path: string = DEFAULT_CHAT_WS_PATH,
): string {
  if (typeof window === "undefined") {
    // Client will resolve a real URL on hydrate; connect() is a no-op without window.
    return path;
  }
  const isHttps = window.location.protocol === "https:";
  if (isHttps) {
    return `wss://${window.location.hostname}${path}`;
  }
  return `ws://${window.location.hostname}:8080${path}`;
}
