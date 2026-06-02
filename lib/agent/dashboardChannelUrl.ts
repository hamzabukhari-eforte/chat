import type { ChannelId } from "@/components/sections/ChannelDrawerSection";

export const DASHBOARD_CHANNEL_IDS: ChannelId[] = [
  "whatsapp",
  "facebook",
  "messenger",
  "instagram",
  "instagram-inbox",
];

const CHANNEL_ID_SET = new Set<string>(DASHBOARD_CHANNEL_IDS);

export function isDashboardChannelId(value: string): value is ChannelId {
  return CHANNEL_ID_SET.has(value);
}

export function stripChannelSearchParams(searchParams: URLSearchParams): void {
  for (const id of DASHBOARD_CHANNEL_IDS) {
    if (id === "whatsapp") continue;
    searchParams.delete(id);
  }
}

/** WhatsApp uses no query; other channels use `?{channelId}` (e.g. `?facebook`). */
export function channelFromSearchParams(
  searchParams: URLSearchParams,
): ChannelId {
  for (const id of DASHBOARD_CHANNEL_IDS) {
    if (id === "whatsapp") continue;
    if (searchParams.has(id)) return id;
  }

  const raw = searchParams.toString();
  if (raw && isDashboardChannelId(raw.split("&")[0]?.split("=")[0] ?? "")) {
    return raw.split("&")[0]?.split("=")[0] as ChannelId;
  }

  return "whatsapp";
}

/** Builds `pathname`, optional `?channel`, and `hash` without a trailing `=`. */
export function urlWithChannel(
  pathname: string,
  channel: ChannelId,
  hash = "",
): string {
  if (channel === "whatsapp") return `${pathname}${hash}`;
  return `${pathname}?${channel}${hash}`;
}
