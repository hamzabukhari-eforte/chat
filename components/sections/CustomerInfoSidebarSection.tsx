"use client";

import { FiMail, FiPhone, FiTag, FiX } from "react-icons/fi";
import { AvatarWithInitials } from "../atoms/AvatarWithInitials";
import type { CustomerChatTicket, User } from "../../lib/chat/types";

interface Props {
  customer: User | null;
  /** From `loadConversationById` after the conversation is opened. */
  ticketList?: CustomerChatTicket[];
  /**
   * When true, the main thread already has messages for this chat (conversation was loaded).
   * Used so we do not show “open this chat” after queue refresh dropped `ticketList` from state.
   */
  hasConversationMessages?: boolean;
  onClose: () => void;
}

function formatTicketRegisteredAt(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
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

export function CustomerInfoSidebarSection({
  customer,
  ticketList,
  hasConversationMessages,
  onClose,
}: Props) {
  const ticketsForDisplay =
    ticketList ??
    (hasConversationMessages ? ([] as CustomerChatTicket[]) : undefined);
  // const localTime = new Date().toLocaleTimeString([], {
  //   hour: "numeric",
  //   minute: "2-digit",
  // });

  return (
    <aside className="w-72 min-w-72 bg-white border-l border-gray-200 flex flex-col h-full relative">
      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close customer info"
        className="absolute top-3 left-3 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer z-10"
      >
        <FiX className="w-4 h-4" />
      </button>

      {/* Profile Header */}
      <div className="p-5 pt-10 border-b border-gray-100 flex flex-col items-center text-center">
        <AvatarWithInitials
          name={customer?.name ?? "?"}
          src={customer?.avatar}
          size={80}
          className="border-4 border-white shadow-sm mb-3"
          alt={customer?.name ?? "Customer"}
        />
        <h3 className="font-semibold text-gray-900 mb-3">
          {customer?.name ?? "No customer selected"}
        </h3>
        {/* <p className="text-sm text-gray-500 mb-3">
          {customer?.plan ?? "Standard Plan"}
        </p> */}
     
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto py-5 px-4">
        {/* About Section */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            About
          </h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <FiMail className="text-gray-400 mt-0.5 w-4 h-4 shrink-0" />
              <span className="text-gray-700 break-all">
                {customer?.email ?? "customer@email.com"}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <FiPhone className="text-gray-400 mt-0.5 w-4 h-4 shrink-0" />
              <span className="text-gray-700">
                {customer?.phone ?? "0813-0000-0000"}
              </span>
            </li>
            {/* <li className="flex items-start gap-3">
              <FiClock className="text-gray-400 mt-0.5 w-4 h-4 shrink-0" />
              <span className="text-gray-700">Local time: {localTime}</span>
            </li> */}
          </ul>
        </div>

        {/* Recent Activity Section */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Recent Activity
          </h4>
          <div className="space-y-4">
            {ticketsForDisplay === undefined ? (
              <p className="text-xs text-gray-500">
                Open this chat to load ticket history from the server.
              </p>
            ) : ticketsForDisplay.length === 0 ? (
              <p className="text-xs text-gray-500">No tickets for this conversation.</p>
            ) : (
              ticketsForDisplay.map((t) => (
                <div key={t.ticketNo} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-gray-100 bg-gray-50">
                    <FiTag className="h-3.5 w-3.5 text-gray-500" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium text-gray-800"
                      title={t.ticketNo}
                    >
                      {t.ticketNo}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      <span className="font-medium text-gray-600">
                        {t.ticketStatus}
                      </span>
                  
                    </p>
                    {t.ticketRegisteredAt ? (
                        <p className="text-xs text-gray-500">
                          <span>{formatTicketRegisteredAt(t.ticketRegisteredAt)}</span>
                        </p>
                      ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
