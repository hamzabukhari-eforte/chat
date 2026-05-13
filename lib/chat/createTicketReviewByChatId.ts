const DEFAULT_HTTP_API_ORIGIN = "http://10.0.10.53:8080";
const DEFAULT_CREATE_TICKET_REVIEW_PATH =
  "/SES/app/SocialMedia/whatsapp/createTicketReviewByChatId";

function getDefaultApiOrigin(): string {
  if (typeof window === "undefined") return DEFAULT_HTTP_API_ORIGIN;
  return window.location.protocol === "https:"
    ? window.location.origin
    : DEFAULT_HTTP_API_ORIGIN;
}

function getCreateTicketReviewByChatIdUrl(): string {
  const fromEnv =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_CREATE_TICKET_REVIEW_BY_CHAT_ID_URL?.trim()
      ? process.env.NEXT_PUBLIC_CREATE_TICKET_REVIEW_BY_CHAT_ID_URL.trim()
      : undefined;
  return (
    fromEnv ??
    `${getDefaultApiOrigin()}${DEFAULT_CREATE_TICKET_REVIEW_PATH}`
  ).replace(/\/$/, "");
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
      domainIndex: body.domainIndex,
      moduleIndex: body.moduleIndex,
    }),
  });
  if (!res.ok) {
    throw new Error(`createTicketReviewByChatId failed: ${res.status}`);
  }
}
