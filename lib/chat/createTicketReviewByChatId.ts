import { getApiOrigin } from "./apiOrigin";

const CREATE_TICKET_REVIEW_PATH =
  "/SES/SocialMedia/whatsapp/createTicketReviewByChatId";

function getCreateTicketReviewByChatIdUrl(): string {
  return `${getApiOrigin()}${CREATE_TICKET_REVIEW_PATH}`.replace(/\/$/, "");
}

function shouldSendUserIdInParams(): boolean {
  return (
    typeof process !== "undefined" && process.env.NODE_ENV === "development"
  );
}

function getApiFetchCredentials(): RequestCredentials {
  return shouldSendUserIdInParams() ? "omit" : "include";
}

export type CreateTicketReviewByChatIdBody = {
  chatIndex: string | number;
  /** Same value as SES `ticketIndex` from `getTicketListByChatId` (parsed as `ticketIndexPtr` in the UI model). */
  ticketIndex: string | number;
  review: string;
  /** Customer phone (CLI). */
  cli: string;
};

/**
 * POST `/SES/SocialMedia/whatsapp/createTicketReviewByChatId`.
 * Mirrors `getTicketListByChatId`: `Userid` query param for the agent session.
 */
export async function postCreateTicketReviewByChatId(
  agentUserId: string,
  body: CreateTicketReviewByChatIdBody,
): Promise<void> {
  const url = new URL(getCreateTicketReviewByChatIdUrl());
  url.searchParams.set("Userid", agentUserId);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: getApiFetchCredentials(),
    body: JSON.stringify({
      chatIndex: body.chatIndex,
      ticketIndex: body.ticketIndex,
      review: body.review,
      cli: body.cli,
    }),
  });
  if (!res.ok) {
    throw new Error(`createTicketReviewByChatId failed: ${res.status}`);
  }
}
