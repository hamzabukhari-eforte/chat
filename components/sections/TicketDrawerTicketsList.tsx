"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiChevronDown,
  FiChevronRight,
  FiPaperclip,
} from "react-icons/fi";
import { toast } from "sonner";
import { getApiOrigin } from "@/lib/chat/apiOrigin";
import { postCreateTicketReviewByChatId } from "@/lib/chat/createTicketReviewByChatId";
import { parseTicketListRow } from "@/lib/chat/ticketList";
import type { CustomerChatTicket } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

/** Matches secondary actions in {@link ChatWindowSection} (e.g. Info / Ticket). */
const CHAT_HEADER_SECONDARY_BTN =
  "h-8 px-2 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 " +
  "text-gray-700 text-xs font-medium whitespace-nowrap shrink-0 " +
  "hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 transition-colors cursor-pointer";

type Props = {
  /** Logged-in agent — `Userid` query param for SES. */
  agentUserId: string;
  /** WhatsApp chat index for the active conversation. */
  chatIndex?: string | number | null;
  /** Customer phone (CLI). */
  cli?: string;
  tickets: CustomerChatTicket[];
  loading: boolean;
};

const TICKET_DETAILS_BY_INDEX_PATH =
  "/SES/assigncomplaint/GetTicketDetailsByIndex";

function getTicketDetailsByIndexUrl(): string {
  return `${getApiOrigin()}${TICKET_DETAILS_BY_INDEX_PATH}`.replace(/\/$/, "");
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

function formatTicketDateTime(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "—";
  const normalized = /^\d{4}-\d{2}-\d{2} \d/.test(t) ? t.replace(" ", "T") : t;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function sortedFollowups(ticket: CustomerChatTicket) {
  const list = ticket.followupHistory ?? [];
  return [...list].sort((a, b) => {
    const ia = a.index ?? 0;
    const ib = b.index ?? 0;
    if (ia !== ib) return ia - ib;
    return String(a.followupDate ?? "").localeCompare(
      String(b.followupDate ?? ""),
    );
  });
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  if (!value.trim()) return null;
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-x-2 gap-y-1 text-xs sm:grid-cols-[10rem_1fr]">
      <dt className="font-medium text-gray-500">{label}</dt>
      <dd className="min-w-0 text-gray-800 wrap-break-word">{value}</dd>
    </div>
  );
}

export function TicketDrawerTicketsList({
  agentUserId,
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

      setSavingReviewForTicketNo(ticket.ticketNo);
      try {
        await postCreateTicketReviewByChatId(uid, {
          chatIndex,
          ticketIndex,
          review,
          cli: cliNorm,
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
    [agentUserId, chatIndex, cli, reviewDraftByTicket],
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
            const followups = sortedFollowups(ticketView);
            const reviewOpen = reviewOpenFor === ticket.ticketNo;
            const reviewDraft = reviewDraftByTicket[ticket.ticketNo] ?? "";
            const savingReview = savingReviewForTicketNo === ticket.ticketNo;
            const detailLoading = Boolean(loadingByTicketNo[ticket.ticketNo]);
            const isClosed =
              ticketView.ticketStatus.trim().toLowerCase() === "closed";
            return (
              <article
                key={ticket.ticketNo}
                className="rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <div className="flex w-full items-start justify-between gap-3 px-3 py-3 transition-colors hover:bg-gray-50 sm:gap-4 sm:px-4">
                  <div className="min-w-0 flex-1 pr-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleTicket(ticket)}
                        aria-expanded={open}
                        aria-label={
                          open
                            ? `Collapse ticket ${ticket.ticketNo}`
                            : `Expand ticket ${ticket.ticketNo}`
                        }
                        className="col-start-1 row-start-1 flex min-w-0 items-start gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 cursor-pointer"
                      >
                        <span className="mt-0.5 shrink-0 text-gray-400">
                          {open ? (
                            <FiChevronDown className="h-4 w-4" aria-hidden />
                          ) : (
                            <FiChevronRight className="h-4 w-4" aria-hidden />
                          )}
                        </span>
                        <p className="min-w-0 truncate font-mono text-sm tracking-tight text-blue-900">
                          {ticket.ticketNo}
                        </p>
                      </button>

                      <div
                        ref={reviewOpen ? reviewMenuRef : null}
                        className="col-start-2 relative flex items-center justify-end gap-2"
                      >
                        <span
                          className={cn(
                            "max-w-38 truncate rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700",
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
                          <button
                            type="button"
                            onClick={() =>
                              setReviewOpenFor((prev) =>
                                prev === ticket.ticketNo ? null : ticket.ticketNo,
                              )
                            }
                            className={CHAT_HEADER_SECONDARY_BTN}
                          >
                            Review
                          </button>
                        ) : null}
                        {reviewOpen ? (
                          <div className="absolute right-0 top-full z-20 mt-2 w-[min(22rem,75vw)] rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                            <p className="mb-2 text-xs font-medium text-gray-700">
                              Review ticket # {ticket.ticketNo}
                            </p>
                            <textarea
                              value={reviewDraft}
                              onChange={(e) =>
                                setReviewDraftByTicket((prev) => ({
                                  ...prev,
                                  [ticket.ticketNo]: e.target.value,
                                }))
                              }
                              rows={4}
                              placeholder="Write your review"
                              className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
                            />
                            <div className="mt-2 flex justify-end gap-2">
                              <button
                                type="button"
                                disabled={savingReview}
                                onClick={() => setReviewOpenFor(null)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={savingReview}
                                onClick={() => void saveReview(ticket)}
                                className="rounded-lg border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 cursor-pointer disabled:opacity-50"
                              >
                                {savingReview ? "Saving…" : "Save"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <p className="col-start-1 row-start-2 line-clamp-2 text-xs leading-snug text-gray-500">
                        <span className="font-medium text-gray-500">
                          Complaint type:
                        </span>{" "}
                        <span className="font-medium text-gray-500">
                          {ticketView.complaintType || "—"}
                        </span>
                      </p>
                      <p className="col-start-2 row-start-2 shrink-0 text-right text-xs text-gray-400">
                        Registered{" "}
                        {formatTicketDateTime(
                          ticketView.ticketRegisteredAt || ticketView.reportedDate,
                        )}
                      </p>
                      <p className="col-start-1 row-start-3 line-clamp-2 text-xs leading-snug text-gray-500">
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
                    {followups.length > 0 ? (
                      <section
                        aria-label="Follow-up history"
                        className="rounded-lg border border-gray-300 bg-gray-50/80 p-3"
                      >
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-500">
                          Follow-up history
                        </h3>
                        <ol className="mt-2 space-y-3">
                          {followups.map((f, i) => (
                            <li
                              key={`${f.index ?? i}-${f.followupDate ?? i}`}
                              className="flex gap-3 text-xs"
                            >
                              <span
                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full ring-2 ring-white"
                                style={{
                                  backgroundColor:
                                    f.statusColor?.trim() || "#6b7280",
                                }}
                                aria-hidden
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <span className="font-semibold text-gray-900">
                                    {f.statusText ?? "Update"}
                                  </span>
                                  <span className="text-gray-500">
                                    {formatTicketDateTime(f.followupDate)}
                                  </span>
                                </div>
                                {f.followupBy ? (
                                  <p className="mt-0.5 text-gray-600">
                                    By {f.followupBy}
                                  </p>
                                ) : null}
                                {f.remarks ? (
                                  <p className="mt-1 whitespace-pre-wrap text-gray-800">
                                    <span className="font-semibold text-gray-500">Remarks:</span> {f.remarks}
                                  </p>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </section>
                    ) : (
                      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                        No follow-up history on this ticket yet.
                      </p>
                    )}

                    {/* <section className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Ticket details
                      </h3>
                      <dl className="space-y-2">
                        <DetailLine
                          label="Domain"
                          value={ticket.domain ?? ""}
                        />
                        <DetailLine
                          label="Complaint type"
                          value={ticket.complaintType ?? ""}
                        />
                        <DetailLine
                          label="Complaint sub-type"
                          value={ticket.complaintSubType ?? ""}
                        />
                        <DetailLine
                          label="Nature"
                          value={ticket.nature ?? ""}
                        />
                        <DetailLine
                          label="Priority"
                          value={
                            [ticket.priority, ticket.priorityLevel]
                              .filter(Boolean)
                              .join(" · ") ?? ""
                          }
                        />
                        <DetailLine
                          label="Reported by"
                          value={ticket.reportedBy ?? ""}
                        />
                        <DetailLine
                          label="Location"
                          value={(ticket.location ?? "").trim()}
                        />
                        <DetailLine
                          label="Problem occurred"
                          value={formatTicketDateTime(
                            ticket.problemOccuredDate,
                          )}
                        />
                        <DetailLine
                          label="Brief"
                          value={ticket.briefDescription ?? ""}
                        />
                        <DetailLine
                          label="Detailed"
                          value={ticket.detailedDescription ?? ""}
                        />
                      </dl>
                    </section> */}

                    {/* {ticketView.dynamicFields &&
                    Object.keys(ticketView.dynamicFields).length > 0 ? (
                      <section className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Additional fields
                        </h3>
                        <dl className="space-y-2">
                          {Object.entries(ticketView.dynamicFields).map(
                            ([key, val]) => (
                              <DetailLine
                                key={key}
                                label={humanizeKey(key)}
                                value={val}
                              />
                            ),
                          )}
                        </dl>
                      </section>
                    ) : null} */}

                    {/* {ticketView.attachmentHistory &&
                    ticketView.attachmentHistory.length > 0 ? (
                      <section className="space-y-2">
                        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          <FiPaperclip className="h-3.5 w-3.5" aria-hidden />
                          Attachments
                        </h3>
                        <ul className="space-y-1.5 text-xs text-gray-700">
                          {ticketView.attachmentHistory.map((a, idx) => (
                            <li
                              key={`${a.actual ?? a.filename ?? idx}`}
                              className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5"
                            >
                              <span className="font-medium">
                                {a.filename ?? a.actual ?? "File"}
                              </span>
                              {a.created ? (
                                <span className="text-gray-500">
                                  {" "}
                                  · {a.created}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    {ticketView.assignmentHistory &&
                    ticketView.assignmentHistory.length > 0 ? (
                      <section className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Assignment history
                        </h3>
                        <ul className="space-y-2 text-xs text-gray-700">
                          {ticketView.assignmentHistory.map((row, idx) => (
                            <li
                              key={`${row.teamName ?? ""}-${idx}`}
                              className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5"
                            >
                              <span className="font-medium">
                                {row.teamName ?? "Team"}
                              </span>
                              {row.engineerName ? (
                                <span> · {row.engineerName}</span>
                              ) : null}
                              {row.assignDate ? (
                                <div className="mt-0.5 text-gray-500">
                                  {row.assignDate}
                                </div>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null} */}

                    {/* {ticketView.actionTakenList &&
                    Object.keys(ticketView.actionTakenList).length > 0 ? (
                      <section className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Actions
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(ticketView.actionTakenList).map(
                            ([id, label]) => (
                              <span
                                key={id}
                                className="inline-flex rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700"
                              >
                                {label}
                              </span>
                            ),
                          )}
                        </div>
                      </section>
                    ) : null} */}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
