"use client";

import { formatTicketDateTime } from "./ticketDrawerUtils";
import type { CustomerChatTicket } from "@/lib/chat/types";

interface TicketFollowupHistoryProps {
  ticket: CustomerChatTicket;
}

export function TicketFollowupHistory({ ticket }: TicketFollowupHistoryProps) {
  const followups = [...(ticket.followupHistory ?? [])].sort((a, b) => {
    const ia = a.index ?? 0;
    const ib = b.index ?? 0;
    if (ia !== ib) return ia - ib;
    return String(a.followupDate ?? "").localeCompare(String(b.followupDate ?? ""));
  });

  if (followups.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
        No follow-up history on this ticket yet.
      </p>
    );
  }

  return (
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
                backgroundColor: f.statusColor?.trim() || "#6b7280",
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
                <p className="mt-0.5 text-gray-600">By {f.followupBy}</p>
              ) : null}
              {f.remarks ? (
                <p className="mt-1 whitespace-pre-wrap text-gray-800">
                  <span className="font-semibold text-gray-500">Remarks:</span>{" "}
                  {f.remarks}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
