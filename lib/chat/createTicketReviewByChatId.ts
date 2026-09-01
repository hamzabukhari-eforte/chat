import {
  getSesApiOrigin,
  SES_API_FETCH_CREDENTIALS,
} from "@/lib/agent/sesApiOrigin";

const DEFAULT_CREATE_TICKET_REVIEW_PATH =
  "/SES/app/SocialMedia/whatsapp/createTicketReviewByChatId";

function getCreateTicketReviewByChatIdUrl(): string {
  const fromEnv =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_CREATE_TICKET_REVIEW_BY_CHAT_ID_URL?.trim()
      ? process.env.NEXT_PUBLIC_CREATE_TICKET_REVIEW_BY_CHAT_ID_URL.trim()
      : undefined;
  return (
    fromEnv ??
    `${getSesApiOrigin()}${DEFAULT_CREATE_TICKET_REVIEW_PATH}`
  ).replace(/\/$/, "");
}

export type CreateTicketReviewByChatIdBody = {
  chatIndex: string | number;
  /** Same value as SES `ticketIndex` from `getTicketListByChatId` (parsed as `ticketIndexPtr` in the UI model). */
  ticketIndex: string | number;
  review: string;
  /** Customer phone (CLI). */
  cli: string;
  /** SES `domainIndex` required by backend review endpoint. */
  domainIndex: number;
  /** SES `moduleIndex` required by backend review endpoint. */
  moduleIndex: number;
};

/**
 * POST `/SES/app/SocialMedia/whatsapp/createTicketReviewByChatId`.
 * Mirrors `getTicketListByChatId`: `Userid` query param for the agent session.
 */
export async function postCreateTicketReviewByChatId(
  agentUserId: string,
  body: CreateTicketReviewByChatIdBody,
  options?: { apiUrl?: string },
): Promise<void> {
  const url = new URL(options?.apiUrl ?? getCreateTicketReviewByChatIdUrl());
  url.searchParams.set("Userid", agentUserId);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: SES_API_FETCH_CREDENTIALS,
    body: JSON.stringify({
      chatIndex: body.chatIndex,
      ticketIndex: body.ticketIndex,
      review: body.review,
      cli: body.cli,
      domainIndex: body.domainIndex,
      moduleIndex: body.moduleIndex,
    }),
  });
  if (!res.ok) {
    throw new Error(`createTicketReviewByChatId failed: ${res.status}`);
  }
}
