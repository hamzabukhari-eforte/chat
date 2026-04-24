"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import type { CustomerChatTicket } from "@/lib/chat/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: CustomerChatTicket | null;
};

export function TicketReviewModal({ open, onOpenChange, ticket }: Props) {
  const titleId = useId();
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const submit = () => {
    toast.success(`Review saved for ticket ${ticket?.ticketNo ?? "—"}.`);
    onOpenChange(false);
  };

  if (!open || !ticket) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-lg flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-base font-semibold text-gray-900">
          Review ticket # {ticket.ticketNo}
        </h2>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={8}
          placeholder="Write your review"
          className="mt-3 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="rounded-lg border border-brand-600 bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
