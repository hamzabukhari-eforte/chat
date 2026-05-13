"use client";

import { FiX } from "react-icons/fi";
import { HiOutlineTicket } from "react-icons/hi2";

const CHAT_HEADER_OUTLINED_BTN =
  "h-8 px-4 flex items-center gap-1.5 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium " +
  "hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 transition-colors cursor-pointer shrink-0";

interface TicketDrawerPanelHeaderProps {
  titleId: string;
  descriptionId: string;
  drawerView: "list" | "form";
  onToggleView: () => void;
  onClose: () => void;
}

export function TicketDrawerPanelHeader({
  titleId,
  descriptionId,
  drawerView,
  onToggleView,
  onClose,
}: TicketDrawerPanelHeaderProps) {
  return (
    <header className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-gray-100 p-4 sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <HiOutlineTicket
          className="h-5 w-5 shrink-0 text-brand-600"
          aria-hidden
        />
        <div className="min-w-0">
          <h2 id={titleId} className="text-base text-brand-500 font-semibold leading-none">
            {drawerView === "list" ? "Tickets" : "Register Complaint"}
          </h2>
          <p id={descriptionId} className="sr-only">
            {drawerView === "list"
              ? "Tickets for this conversation. Use Create new ticket in the header, or expand a card for details and review."
              : "Register a new complaint using the form below."}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={onToggleView} className={CHAT_HEADER_OUTLINED_BTN}>
          {drawerView === "list" ? "Create new ticket" : "View recent tickets"}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close ticket panel"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 cursor-pointer"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
