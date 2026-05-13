"use client";

import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import { cn } from "@/lib/utils";
import type { CustomerChatTicket } from "@/lib/chat/types";
import { formatTicketDateTime } from "./ticketDrawerUtils";
import { TicketFollowupHistory } from "./TicketFollowupHistory";

const CHAT_HEADER_SECONDARY_BTN =
  "h-8 px-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 " +
  "text-gray-700 text-xs font-medium whitespace-nowrap shrink-0 " +
  "hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 transition-colors cursor-pointer";

interface TicketListItemProps {
  ticket: CustomerChatTicket;
  ticketView: CustomerChatTicket;
  open: boolean;
  detailLoading: boolean;
  reviewOpen: boolean;
  reviewDraft: string;
  savingReview: boolean;
  reviewMenuRef: React.RefObject<HTMLDivElement | null>;
  onToggleTicket: () => void;
  onToggleReview: () => void;
  onReviewDraftChange: (value: string) => void;
  onCancelReview: () => void;
  onSaveReview: () => void;
}

export function TicketListItem({
  ticket,
  ticketView,
  open,
  detailLoading,
  reviewOpen,
  reviewDraft,
  savingReview,
  reviewMenuRef,
  onToggleTicket,
  onToggleReview,
  onReviewDraftChange,
  onCancelReview,
  onSaveReview,
}: TicketListItemProps) {
  const isClosed = ticketView.ticketStatus.trim().toLowerCase() === "closed";

  return (
    <article className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex w-full items-start justify-between gap-3 px-3 py-3 transition-colors hover:bg-gray-50 sm:gap-4 sm:px-4">
        <div className="min-w-0 flex-1 pr-1">
          <div className="grid max-md:grid-cols-[1fr_auto] max-md:gap-x-2 max-md:gap-y-2 md:grid-cols-[minmax(0,1fr)_auto] md:gap-x-3 md:gap-y-1.5">
            <button
              type="button"
              onClick={onToggleTicket}
              aria-expanded={open}
              aria-label={
                open
                  ? `Collapse ticket ${ticket.ticketNo}`
                  : `Expand ticket ${ticket.ticketNo}`
              }
              className={cn(
                "flex min-w-0 items-center md:items-start gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 cursor-pointer md:col-start-1 md:row-start-1 md:w-auto md:max-w-none",
                isClosed
                  ? "max-md:col-span-2 max-md:row-start-1 max-md:w-full"
                  : "max-md:col-start-1 max-md:row-start-1 max-md:min-w-0",
              )}
            >
              <span className="mt-0.5 shrink-0 text-gray-400">
                {open ? (
                  <FiChevronDown className="h-4 w-4" aria-hidden />
                ) : (
                  <FiChevronRight className="h-4 w-4" aria-hidden />
                )}
              </span>
              <p className="min-w-0 wrap-break-word font-mono text-sm tracking-tight text-blue-900 max-md:whitespace-normal md:truncate">
                {ticket.ticketNo}
              </p>
            </button>

            <div
              ref={reviewOpen ? reviewMenuRef : null}
              className="max-md:contents md:col-start-2 md:row-start-1 md:flex md:shrink-0 md:flex-row md:items-center md:justify-end md:gap-2"
            >
              <span
                className={cn(
                  "inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 max-md:col-span-2 max-md:row-start-2 max-md:max-w-none max-md:justify-self-start max-md:whitespace-normal max-md:wrap-break-word md:inline-flex md:max-w-38 md:truncate md:text-right",
                  "ring-1 ring-inset ring-gray-200/80",
                )}
                style={
                  ticketView.statusColor
                    ? {
                        color: ticketView.statusColor,
                        borderColor: ticketView.statusColor,
                        backgroundColor: `${ticketView.statusColor}1A`,
                      }
                    : undefined
                }
                title={ticketView.ticketStatus}
              >
                {ticketView.ticketStatus}
              </span>
              {!isClosed ? (
                <div className="relative max-md:col-start-2 max-md:row-start-1 max-md:justify-self-end max-md:self-start md:relative">
                  <button
                    type="button"
                    onClick={onToggleReview}
                    className={CHAT_HEADER_SECONDARY_BTN}
                  >
                    Review
                  </button>
                  {reviewOpen ? (
                    <div className="absolute right-0 top-full z-20 mt-2 w-[min(22rem,75vw)] rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                      <p className="mb-2 text-xs font-medium text-gray-700">
                        Review ticket # {ticket.ticketNo}
                      </p>
                      <textarea
                        value={reviewDraft}
                        onChange={(e) => onReviewDraftChange(e.target.value)}
                        rows={4}
                        placeholder="Write your review"
                        className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={savingReview}
                          onClick={onCancelReview}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={savingReview}
                          onClick={onSaveReview}
                          className="rounded-lg border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 cursor-pointer disabled:opacity-50"
                        >
                          {savingReview ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <p className="col-start-2 row-start-2 shrink-0 text-xs text-gray-400 max-md:col-span-2 max-md:row-start-3 max-md:text-left md:text-right">
              Registered{" "}
              {formatTicketDateTime(
                ticketView.ticketRegisteredAt || ticketView.reportedDate,
              )}
            </p>
            <p className="col-start-1 row-start-2 text-xs leading-snug text-gray-500 line-clamp-2 max-md:col-span-2 max-md:row-start-4 max-md:line-clamp-none max-md:wrap-break-word">
              <span className="font-medium text-gray-500">Complaint type:</span>{" "}
              <span className="font-medium text-gray-500">
                {ticketView.complaintType || "—"}
              </span>
            </p>
            <p className="col-start-1 row-start-3 text-xs leading-snug text-gray-500 line-clamp-2 max-md:col-span-2 max-md:row-start-5 max-md:line-clamp-none max-md:wrap-break-word md:col-span-1">
              <span className="font-medium text-gray-500">
                Complaint sub-type:
              </span>{" "}
              <span className="font-medium text-gray-500">
                {ticketView.complaintSubType || "—"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {open ? (
        <div className="space-y-4 border-t border-gray-100 px-3 pb-4 pt-2 sm:px-4">
          {detailLoading ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
              Loading ticket details…
            </p>
          ) : null}
          <TicketFollowupHistory ticket={ticketView} />
        </div>
      ) : null}
    </article>
  );
}
