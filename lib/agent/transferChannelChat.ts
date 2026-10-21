/**
 * Shared SES `transferChat` POST — used by agent inbox and messenger dashboard.
 *
 * Body: `{ chatIndex, domainIndex, chatFrom, agentIndex, isTransferredToAgent }`
 * `agentIndex`: `0` for queue; otherwise target agent id from `userList`.
 * `isTransferredToAgent`: `false` for queue, `true` for agent.
 *
 * Response `status`: 0 = cannot transfer, 1 = success, 2 = already closed, 3 = self-assign.
 */

import { SES_API_FETCH_CREDENTIALS } from "@/lib/agent/sesApiOrigin";
import type { SocialChannelApiUrls } from "@/lib/agent/socialChannelApiUrls";

export function chatIndexToApiInt(chatIndex: string | number): number | null {
  if (typeof chatIndex === "number" && Number.isFinite(chatIndex)) {
    return Math.trunc(chatIndex);
  }
  const n = Number(String(chatIndex).trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** transferChat JSON: `status` 0 = cannot transfer, 1 = success, 2 = already closed. */
export function parseTransferChatStatus(json: unknown): number | null {
  if (typeof json === "number") return json;
  if (!json || typeof json !== "object") return null;
  const raw = (json as Record<string, unknown>).status;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function transferChannelChat(
  urls: SocialChannelApiUrls,
  chatIndex: string | number,
  domainIndex: number,
  chatFrom: number,
  agentIndex: number,
  isTransferredToAgent: boolean,
): Promise<number | null> {
  const ci = chatIndexToApiInt(chatIndex);
  if (ci === null) return null;
  const url = new URL(urls.transferChat);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: SES_API_FETCH_CREDENTIALS,
    body: JSON.stringify({
      chatIndex: ci,
      domainIndex: Math.trunc(domainIndex),
      chatFrom: Math.trunc(chatFrom),
      agentIndex: Math.trunc(agentIndex),
      isTransferredToAgent,
    }),
  });
  if (!res.ok) {
    throw new Error(`transferChat failed: ${res.status}`);
  }
  const json: unknown = await res.json();
  return parseTransferChatStatus(json);
}
