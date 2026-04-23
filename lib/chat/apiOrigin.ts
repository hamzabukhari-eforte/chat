const DEV_SES_API_FALLBACK = "http://10.0.10.53:8080";

/**
 * SES HTTP API base URL for **local development** only (`NEXT_PUBLIC_HTTP_API_ORIGIN`
 * or fallback). Media URLs in dev use this so assets stay on the SES host even when
 * the app runs on `http://localhost`.
 */
export function getDevelopmentSesApiBaseUrl(): string {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_HTTP_API_ORIGIN?.trim()
      : undefined;
  return (fromEnv || DEV_SES_API_FALLBACK).replace(/\/$/, "");
}

/**
 * Base origin for SES REST calls.
 * - Production (or any `https:` page): current site origin.
 * - Development on `http:` (e.g. localhost): {@link getDevelopmentSesApiBaseUrl}.
 * - SSR: development uses dev base URL; otherwise prefers `VERCEL_URL`, then fallback.
 */
export function getApiOrigin(): string {
  if (typeof window !== "undefined") {
    if (window.location.protocol === "https:") {
      return window.location.origin.replace(/\/$/, "");
    }
    if (
      typeof process !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      return getDevelopmentSesApiBaseUrl();
    }
    return window.location.origin.replace(/\/$/, "");
  }

  if (
    typeof process !== "undefined" &&
    process.env.NODE_ENV === "development"
  ) {
    return getDevelopmentSesApiBaseUrl();
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`.replace(/\/$/, "");
  }

  return DEV_SES_API_FALLBACK;
}
