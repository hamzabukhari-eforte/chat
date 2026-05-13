"use client";

import { FiChevronDown } from "react-icons/fi";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AwayReasonOption } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

const ONLINE_META = {
  label: "Online",
  dot: "bg-emerald-500",
  trigger:
    "border-emerald-100 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/90",
} as const;

const BREAK_LIST_ITEM = "hover:bg-gray-50";

interface AwayStatusControlProps {
  awayReasons: AwayReasonOption[];
  popoverOpen: boolean;
  onBreak: boolean;
  settingAwayId: string | null;
  onPopoverOpenChange: (open: boolean) => void;
  onSelectAwayReason: (reason: AwayReasonOption) => void;
}

export function AwayStatusControl({
  awayReasons,
  popoverOpen,
  onBreak,
  settingAwayId,
  onPopoverOpenChange,
  onSelectAwayReason,
}: AwayStatusControlProps) {
  if (awayReasons.length === 0) {
    return (
      <span
        className="inline-flex h-8 shrink-0 items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 text-sm font-medium text-emerald-900"
        title="No break options from server."
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-white/80"
          aria-hidden
        />
        <span className="truncate">{ONLINE_META.label}</span>
      </span>
    );
  }

  return (
    <Popover
      open={popoverOpen && !onBreak}
      onOpenChange={(open) => !onBreak && onPopoverOpenChange(open)}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={onBreak}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 h-8 disabled:pointer-events-none disabled:opacity-40",
            ONLINE_META.trigger,
          )}
          aria-label="Open break status menu"
          aria-expanded={popoverOpen}
          aria-haspopup="dialog"
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full ring-2 ring-white/80",
              ONLINE_META.dot,
            )}
            aria-hidden
          />
          <span className="max-w-48 truncate sm:max-w-64">Online</span>
          <FiChevronDown className="h-4 w-4 opacity-70" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 p-1 max-h-[min(22rem,70vh)] overflow-y-auto"
      >
        <p className="px-2 pb-1 pt-0.5 text-xs font-medium text-gray-500">
          Start a break
        </p>
        <ul className="space-y-0.5" role="listbox">
          {awayReasons.map((reason) => (
            <li key={reason.id} role="none">
              <button
                type="button"
                role="option"
                disabled={settingAwayId === reason.id}
                onClick={() => onSelectAwayReason(reason)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-gray-800 transition-colors cursor-pointer disabled:opacity-60",
                  BREAK_LIST_ITEM,
                )}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                  aria-hidden
                />
                {settingAwayId === reason.id ? "Setting…" : reason.reason}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
