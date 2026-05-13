"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { postCreateTicketReviewByChatId } from "@/lib/chat/createTicketReviewByChatId";
import { parseTicketListRow } from "@/lib/chat/ticketList";
import type { CustomerChatTicket } from "@/lib/chat/types";
import { TicketListItem } from "./ticket-drawer/TicketListItem";

type Props = {
  /** Logged-in agent — `Userid` query param for SES. */
  agentUserId: string;
  /** SES domain index used by review submit API. */
  domainIndex?: number | null;
  /** SES module index used by review submit API. */
  moduleIndex?: number | null;
  /** WhatsApp chat index for the active conversation. */
  chatIndex?: string | number | null;
  /** Customer phone (CLI). */
  cli?: string;
  tickets: CustomerChatTicket[];
  loading: boolean;
};

const DEFAULT_HTTP_API_ORIGIN = "http://10.0.10.53:8080";
const DEFAULT_TICKET_DETAILS_BY_INDEX_PATH =
  "/SES/assigncomplaint/GetTicketDetailsByIndex";

function getDefaultApiOrigin(): string {
  if (typeof window === "undefined") return DEFAULT_HTTP_API_ORIGIN;
  return window.location.protocol === "https:"
    ? window.location.origin
    : DEFAULT_HTTP_API_ORIGIN;
}

function getTicketDetailsByIndexUrl(): string {
  const fromEnv =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_GET_TICKET_DETAILS_BY_INDEX_URL?.trim()
      ? process.env.NEXT_PUBLIC_GET_TICKET_DETAILS_BY_INDEX_URL.trim()
      : undefined;
  return (
    fromEnv ??
    `${getDefaultApiOrigin()}${DEFAULT_TICKET_DETAILS_BY_INDEX_PATH}`
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

async function fetchTicketDetailsByIndexPtr(
  indexPtr: string | number,
): Promise<CustomerChatTicket | null> {
  const ptr = String(indexPtr).trim();
  if (!ptr) return null;
  const url = new URL(getTicketDetailsByIndexUrl());
  url.searchParams.set("indexptr", ptr);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: getApiFetchCredentials(),
  });
  if (!res.ok) {
    throw new Error(`GetTicketDetailsByIndex failed: ${res.status}`);
  }
  const raw: unknown = await res.json();

  if (Array.isArray(raw)) {
    for (const row of raw) {
      const parsed = parseTicketListRow(row);
      if (parsed) return parsed;
    }
    return null;
  }

  if (raw && typeof raw === "object") {
    const direct = parseTicketListRow(raw);
    if (direct) return direct;

    const o = raw as Record<string, unknown>;
    const nestedKeys = ["data", "Data", "result", "Result", "ticket", "ticketDetails"];
    for (const key of nestedKeys) {
      const value = o[key];
      if (Array.isArray(value)) {
        for (const row of value) {
          const parsed = parseTicketListRow(row);
          if (parsed) return parsed;
        }
      } else {
        const parsed = parseTicketListRow(value);
        if (parsed) return parsed;
      }
    }
  }

  return null;
}

export function TicketDrawerTicketsList({
  agentUserId,
  domainIndex,
  moduleIndex,
  chatIndex,
  cli,
  tickets,
  loading,
}: Props) {
  const [expandedNo, setExpandedNo] = useState<string | null>(null);
  const [ticketDetailsByNo, setTicketDetailsByNo] = useState<
    Record<string, CustomerChatTicket>
  >({});
  const [loadingByTicketNo, setLoadingByTicketNo] = useState<
    Record<string, boolean>
  >({});
  const [reviewOpenFor, setReviewOpenFor] = useState<string | null>(null);
  const [reviewDraftByTicket, setReviewDraftByTicket] = useState<
    Record<string, string>
  >({});
  const [savingReviewForTicketNo, setSavingReviewForTicketNo] = useState<
    string | null
  >(null);
  const reviewMenuRef = useRef<HTMLDivElement | null>(null);
  const ticketDetailsFetchInFlightRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!reviewOpenFor) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = reviewMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setReviewOpenFor(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [reviewOpenFor]);

  const handleToggleTicket = useCallback(
    (ticket: CustomerChatTicket) => {
      const isOpen = expandedNo === ticket.ticketNo;
      if (isOpen) {
        setExpandedNo(null);
        return;
      }

      setExpandedNo(ticket.ticketNo);

      const key = ticket.ticketNo;
      if (ticketDetailsByNo[key] !== undefined) return;
      if (ticket.ticketIndexPtr === undefined || ticket.ticketIndexPtr === null) return;
      if (ticketDetailsFetchInFlightRef.current[key]) return;

      ticketDetailsFetchInFlightRef.current[key] = true;
      setLoadingByTicketNo((m) => ({ ...m, [key]: true }));

      void fetchTicketDetailsByIndexPtr(ticket.ticketIndexPtr)
        .then((detail) => {
          if (detail) {
            setTicketDetailsByNo((m) => ({ ...m, [key]: detail }));
          }
        })
        .catch((e) => {
          toast.error(
            e instanceof Error ? e.message : "Unable to load ticket details.",
          );
        })
        .finally(() => {
          ticketDetailsFetchInFlightRef.current[key] = false;
          setLoadingByTicketNo((m) => ({
            ...m,
            [key]: false,
          }));
        });
    },
    [expandedNo, ticketDetailsByNo],
  );

  const saveReview = useCallback(
    async (ticket: CustomerChatTicket) => {
      const review = (reviewDraftByTicket[ticket.ticketNo] ?? "").trim();
      if (!review) {
        toast.error("Write a review before saving.");
        return;
      }
      if (chatIndex === undefined || chatIndex === null || String(chatIndex).trim() === "") {
        toast.error("Chat is not ready yet (missing chat index).");
        return;
      }
      const ticketIndex = ticket.ticketIndexPtr;
      if (ticketIndex === undefined || ticketIndex === null || String(ticketIndex).trim() === "") {
        toast.error("Ticket index is missing; refresh the ticket list and try again.");
        return;
      }
      const cliNorm = (cli ?? "").trim();
      if (!cliNorm) {
        toast.error("Customer phone (CLI) is missing for this chat.");
        return;
      }
      const uid = agentUserId.trim();
      if (!uid) {
        toast.error("Agent session is not available.");
        return;
      }
      if (domainIndex === undefined || domainIndex === null) {
        toast.error("Domain index is missing; refresh chats and try again.");
        return;
      }
      if (moduleIndex === undefined || moduleIndex === null) {
        toast.error("Module index is missing; refresh chats and try again.");
        return;
      }

      setSavingReviewForTicketNo(ticket.ticketNo);
      try {
        await postCreateTicketReviewByChatId(uid, {
          chatIndex,
          ticketIndex,
          review,
          cli: cliNorm,
          domainIndex: Math.trunc(domainIndex),
          moduleIndex: Math.trunc(moduleIndex),
        });
        toast.success(`Review saved for ticket ${ticket.ticketNo}.`);
        setReviewOpenFor(null);
        setReviewDraftByTicket((prev) => {
          const next = { ...prev };
          delete next[ticket.ticketNo];
          return next;
        });
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Unable to save the review.",
        );
      } finally {
        setSavingReviewForTicketNo(null);
      }
    },
    [agentUserId, chatIndex, cli, domainIndex, moduleIndex, reviewDraftByTicket],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading tickets…</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-gray-500">
            No tickets linked to this conversation yet. Use{" "}
            <span className="font-medium text-gray-700">Create new ticket</span>{" "}
            in the panel header to register a complaint.
          </p>
        ) : (
          tickets.map((ticket) => {
            const details = ticketDetailsByNo[ticket.ticketNo];
            const ticketView = details
              ? {
                  ...ticket,
                  ...details,
                  // Keep list status unchanged; detail API should not rewrite badge state.
                  ticketStatus: ticket.ticketStatus,
                  statusColor: ticket.statusColor,
                }
              : ticket;
            const open = expandedNo === ticket.ticketNo;
            const reviewOpen = reviewOpenFor === ticket.ticketNo;
            const reviewDraft = reviewDraftByTicket[ticket.ticketNo] ?? "";
            const savingReview = savingReviewForTicketNo === ticket.ticketNo;
            const detailLoading = Boolean(loadingByTicketNo[ticket.ticketNo]);
            return (
              <TicketListItem
                key={ticket.ticketNo}
                ticket={ticket}
                ticketView={ticketView}
                open={open}
                detailLoading={detailLoading}
                reviewOpen={reviewOpen}
                reviewDraft={reviewDraft}
                savingReview={savingReview}
                reviewMenuRef={reviewMenuRef}
                onToggleTicket={() => handleToggleTicket(ticket)}
                onToggleReview={() =>
                  setReviewOpenFor((prev) =>
                    prev === ticket.ticketNo ? null : ticket.ticketNo,
                  )
                }
                onReviewDraftChange={(value) =>
                  setReviewDraftByTicket((prev) => ({
                    ...prev,
                    [ticket.ticketNo]: value,
                  }))
                }
                onCancelReview={() => setReviewOpenFor(null)}
                onSaveReview={() => void saveReview(ticket)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
